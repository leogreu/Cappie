import { getDifference } from "utils/objects.ts";
import { IndexedDBAdapter as DefaultAdapter } from "./adapters/indexeddb-adapter.ts";
import { PersistenceAdapter } from "./adapters/persistence-adapter.ts";
import { Query, type Collection, type ExtendedKey, type Where } from "./query/query.ts";
import { QueryStore } from "./query/query-store.ts";
import { CRUDMethods, type CRUDTypes } from "./query/live-query.ts";
import { BlockStore } from "./block-store.ts";

// Decorator factory and definition for the inherited data block class
// Both auto-increment (only used for audit records) and version-upgrade are not yet implemented
export type BlockDefinition = {
    collection: string;
    store: string;
    auto?: boolean;
    audit?: boolean;
    global?: boolean;
    compound?: boolean;
    snapshot?: boolean;
    version?: number;
};

export function block(definition: BlockDefinition) {
    return function(target: typeof DataBlock) {
        if (BlockStore.blocks[definition.store]) {
            throw new Error(`The store name ${definition.store} has already been defined.`);
        }

        target.keyPath = Object.keys(target.fields).filter(field => {
            return target.fields[field][definition.compound ? "group" : "key"];
        });

        // For global blocks, remove the project field, while for non-global compound blocks, add
        // the project to the beginning of the key path. The reason for the latter is that some
        // data, such as settings, may share the same compound key between projects. In the
        // future, this should probably use the field's key property, which would allow it to
        // remove the compound property but would require to overwrite the default UUID key.
        // Moreover, the project should probably always be added to the key path since it would
        // also simplify importing blocks with the same key (or UUID) for another project. Lastly,
        // for OpenEDC 3.0, having an auto-increment key could (e.g., for projects) drastically
        // reduce transferred data while the subjectKey and metadata OID's as keys could simplify
        // API imports. This, however, would require a large refactor (e.g., of the live query).
        if (definition.global) {
            delete target.fields.project;
        } else if (definition.compound) {
            target.keyPath.unshift("project");
        }

        target.definition = definition;
        BlockStore.addBlock(definition.store, target);
    }
}

// Decorator factory and definition for the custom data block property
export type FieldType = typeof String
    | typeof Number
    | typeof Boolean
    | typeof Date
    | typeof Object
    | string;

export type FieldDefinition = {
    key?: boolean;
    index?: boolean;
    unique?: boolean;
    lazy?: boolean;
    group?: string;
    type?: FieldType | FieldType[];
    relation?: typeof DataBlock | typeof DataBlock[];
    delete?: "unset" | "cascade";
};

export function field(definition?: FieldDefinition) {
    return function(target: DataBlock | object, name: string) {
        if (!Reflect.ownKeys(target.constructor).includes("fields")) {
            const prototypeFields = Object.getPrototypeOf(target).constructor.fields;
            Reflect.set(target.constructor, "fields", { ...prototypeFields });
        }

        if (definition?.relation) {
            // Use unset as default relational delete behavior
            definition.delete ??= "unset";
        } else if (definition) {
            // Use string as default type
            definition.type ??= String;
        }

        (target.constructor as typeof DataBlock).fields[name] = definition ?? {};
    }
}

// Persistent base class
export class DataBlock {
    static adapter: PersistenceAdapter = DefaultAdapter;
    static fields: Record<string, FieldDefinition> = {};
    static definition: BlockDefinition;
    static keyPath?: string[];

    protected internal: {
        lastState?: Record<string, unknown>;
    } = {};

    @field({ type: "UUID", key: true })
    readonly uuid: string;

    @field({ type: "UUID", index: true })
    readonly project?: string;

    @field({ type: Number, index: true })
    readonly createdDate: number;

    constructor(..._: unknown[]) {
        this.uuid = crypto.randomUUID();
        this.createdDate = Date.now();

        if (!this.static.definition.global) {
            this.project = String();
        }
    }

    static deriveKey(data: Record<string, unknown>) {
        return Object.fromEntries(
            this.keyPath?.map(field => [field, data[field] as string]) ?? []
        );
    }

    public get static() {
        return this.constructor as typeof DataBlock;
    }

    protected get children() {
        const dataBlocks: DataBlock[] = [];
        for (const field of Object.keys(this.static.fields)) {
            const value = Reflect.get(this, field);
            for (const entry of [value].flat()) {
                if (entry instanceof DataBlock) dataBlocks.push(entry);
            }
        }

        return dataBlocks;
    }

    static where<T extends typeof DataBlock>(this: T): Collection<T>
    static where<T extends typeof DataBlock>(this: T, value: string): Where<T>
    static where<T extends typeof DataBlock>(this: T, value: Record<string, ExtendedKey>): Collection<T>
    static where<T extends typeof DataBlock>(this: T, value?: string | Record<string, ExtendedKey>) {
        // Explicit since TS overloads are not externally visible, see Query.where() for details
        if (!value) {
            return new Query<T>(this).where();
        } else if (value instanceof Object) {
            return new Query<T>(this).where(value);
        } else {
            return new Query<T>(this).where(value);
        }
    }

    async commit(options?: { cascade?: boolean, project?: string, reason?: string }, transaction?: string) {
        const { definition, fields, adapter } = this.static;

        // Execute trigger before live query update and persistence
        await this.beforeTrigger();

        // Overwrite project uuid if explicitly specified
        if (options?.project) Reflect.set(this, "project", options.project);

        const state = this.toObject();
        const diff = getDifference(this.internal.lastState ?? {}, state, Object.keys(fields));

        // Update locale cache for optimistic updates and correct change detection first (for slow
        // connections as only setting lastState after persistence may result in repeated commits)
        if (Object.keys(diff).length) {
            const method = this.internal.lastState ? CRUDMethods.UPDATE : CRUDMethods.INSERT;
            this.updateLocalQueryCache(method, state);
        }

        // If enabled, commit children prior to current block to maintain live query consistency
        if (options?.cascade) {
            transaction ??= this.uuid;
            await Promise.all(this.children.map(child => child.commit(options, transaction)));
        }

        // Then, persist current state and rollback on error
        try {
            if (Object.keys(diff).length) {
                if (transaction) {
                    const transactionData = (BlockStore.transactionData[transaction] ??= {});
                    (transactionData[definition.store] ??= []).push(state);
                } else {
                    await adapter.setObject(definition, state, options?.reason);
                    await this.afterTrigger();
                }
            }
    
            // For cascade-initiating blocks, commit all transaction data
            if (transaction === this.uuid) {
                for (const [store, values] of Object.entries(BlockStore.transactionData[transaction])) {
                    const { adapter, definition } = BlockStore.blocks[store];
                    await adapter.setObjects(definition, values);
                }
                delete BlockStore.transactionData[transaction];
            }
        } catch (error) {
            await this.discard();
            throw new Error(error instanceof Error ? error.message : "unexpected-error");
        }

        return this;
    }

    static async commit(data: DataBlock[], project?: string, reasons?: (string | undefined)[]) {
        // Only commit updated or new data, while calling .toObject() only once for performance
        const values = data
            .map(entry => ({ entry, state: entry.toObject() }))
            .filter(({ entry: { internal: { lastState }, static: { fields }}, state }) => {
                const diff = lastState && getDifference(lastState, state, Object.keys(fields));
                return !diff || Object.keys(diff).length;
            })
            .map(({ entry, state }) => {
                entry.updateLocalQueryCache(CRUDMethods.INSERT, state, false);
                return Object.assign(state, project && { project });
            });

        await this.adapter.setObjects(this.definition, values, reasons);
    }

    protected beforeTrigger(): Promise<void> | void {
        // Can be overwritten
    }

    protected afterTrigger(): Promise<void> | void {
        // Can be overwritten
    }

    async discard() {
        // Load the currently valid state from the database and rebuild references
        const key = this.static.deriveKey(this.toObject());
        const state = await this.static.adapter.getObject(this.static.definition, key);
        const dataBlock = state && await this.static.rebuildBlock(state);

        if (dataBlock) {
            Object.keys(this.static.fields).forEach(field => {
                Reflect.set(this, field, Reflect.get(dataBlock, field));
            });
            this.updateLocalQueryCache(CRUDMethods.UPDATE, state);
        } else {
            this.updateLocalQueryCache(CRUDMethods.DELETE, { uuid: this.uuid });
        }
    }

    private updateLocalQueryCache(method: CRUDTypes, state: Record<string, unknown>, force = true) {
        const store = this.static.definition.store;
        QueryStore.dispatchDataChange({ store, method, state }, force);
        this.internal.lastState = structuredClone(state);
    }

    async delete(options?: { cascade?: boolean, reason?: string }) {
        // Delete persisted data block and updated local live query data cache
        const key = this.static.deriveKey(this.toObject());
        await this.static.adapter.deleteObject(this.static.definition, key, options?.reason);
        this.updateLocalQueryCache(CRUDMethods.DELETE, { uuid: this.uuid });

        // If enabled, delete children
        if (options?.cascade) {
            await Promise.all(this.children.map(child => child.delete(options)));
        }

        return undefined;
    }

    get changedFields() {
        return getDifference(this.internal.lastState ?? {}, this.toObject(), Object.keys(this.static.fields));
    }

    toObject() {
        const object: Record<string, unknown> = {};

        // If fields consist of other data blocks, only store a reference to them
        for (const field of Object.keys(this.static.fields)) {
            const value = Reflect.get(this, field);
            if (Array.isArray(value)) {
                object[field] = value.map(entry => {
                    return entry instanceof DataBlock || entry instanceof BlockReference
                        ? entry.toString()
                        : entry;
                });
            } else {
                // Currently, undefined values are set to null to ensure that they can be
                // overwritten, which would not be the case with PostgreSQL otherwise
                object[field] = value instanceof DataBlock || value instanceof BlockReference
                    ? value.toString()
                    : (value ?? null);
            }
        }

        return object;
    }

    toString() {
        return this.reference.toString();
    }

    clone(options?: { cascade?: boolean }) {
        const clone = new this.static() as this;
        for (const field of Object.keys(this.static.fields)) {
            if (Object.keys(DataBlock.fields).includes(field)) continue;

            const value = Reflect.get(this, field);
            if (this.static.fields[field].relation) {
                if (Array.isArray(value) && value.every(entry => entry instanceof DataBlock)) {
                    Reflect.set(clone, field, value.map(entry => entry.clone(options)));
                } else if (value instanceof DataBlock) {
                    Reflect.set(clone, field, value.clone(options));
                }
            } else {
                Reflect.set(clone, field, value);
            }
        }

        return clone;
    }

    find<T extends typeof DataBlock>(block: T, key?: string, value?: unknown, all?: boolean, visited?: Set<string>): InstanceType<T> | undefined
    find<T extends typeof DataBlock>(block: T, key: string | undefined, value: unknown | undefined, all: true, visited?: Set<string>): InstanceType<T>[] | undefined
    find<T extends typeof DataBlock>(block: T, key?: string, value?: unknown, all?: boolean, visited: Set<string> = new Set()): InstanceType<T> | InstanceType<T>[] | undefined {
        // Never evaluate the same model twice
        if (visited.has(this.uuid)) return;
        visited.add(this.uuid);

        // Termination condition, i.e., when the block is found
        if (this instanceof block && (!key || Reflect.get(this, key) === value)) {
            return all ? [this] as InstanceType<T>[] : this as InstanceType<T>;
        }

        let results: InstanceType<T>[] | undefined;
        for (const entry of Object.values(this).flat()) {
            if (entry instanceof DataBlock) {
                if (all) {
                    const result = entry.find(block, key, value, all, visited);
                    if (result) results = [...results ?? [], ...result];
                } else {
                    const result = entry.find(block, key, value, all, visited);
                    if (result) return result;
                }
            }
        }

        return results;
    }

    get reference() {
        const { collection, store } = this.static.definition;
        return new BlockReference<this>(collection, store, this.uuid);
    }

    static async getByUUID<T extends typeof DataBlock>(this: T, uuid: string) {
        const state = await this.adapter.getObject(this.definition, { uuid });
        if (state) return this.fromObject(state) as InstanceType<T>;
    }

    static fromObject<T extends typeof DataBlock>(this: T, state: Record<string, unknown>) {
        const { project, uuid } = state as { project?: string, uuid: string };

        // Try to fetch an existing pending or live query block
        const block = BlockStore.pendingBlocks[uuid]
            ?? QueryStore.getLiveQueryBlock(this, "uuid", uuid, project);
        if (block) return block as Promise<InstanceType<T>>;

        // Otherwise, rebuild the block and mark it pending
        const promise = this.rebuildBlock(state);
        BlockStore.pendingBlocks[uuid] = promise;
        return promise.finally(() => delete BlockStore.pendingBlocks[uuid]) as Promise<InstanceType<T>>;
    }

    private static async rebuildBlock(state: Record<string, unknown>) {
        // Recompose the data block if it includes other referenced data blocks
        const instance: DataBlock = Object.assign(new this, state);
        for (const [fieldName, fieldDefinition] of Object.entries(this.fields)) {
            if (!fieldDefinition.relation) continue;

            const value = Reflect.get(instance, fieldName);
            if (Array.isArray(value)) {
                const references = value
                    .map(entry => BlockReference.fromString(entry))
                    .filter(entry => !!entry);

                if (references.length) {
                    const data = fieldDefinition.lazy
                        ? references
                        : (await Promise.all(
                            // TODO: .catch() and .filter() are currently only present due to a
                            // rare error when deleting a referenced block sometimes results in
                            // an inconsistent state where the reference is still present but
                            // the actually referenced data has been deleted. Without catch and
                            // filter, this would result in a non-composable data tree. In the
                            // future, this should be removed and the deletion mechanism fixed.
                            references.map(reference => reference.data.catch(() => {
                                console.debug("Critical: Block load error", reference.toString());
                            }))
                        )).filter(entry => entry);

                    Reflect.set(instance, fieldName, data);
                }
            } else {
                const reference = BlockReference.fromString(value);
                if (reference) {
                    const data = fieldDefinition.lazy ? reference : await reference.data;
                    Reflect.set(instance, fieldName, data);
                }
            }
        }

        instance.internal.lastState = structuredClone(state);
        return instance;
    }
}

export class BlockReference<T extends DataBlock> {
    collection: string;
    store: string;
    uuid: string;

    constructor(collection: string, store: string, uuid: string) {
        this.collection = collection;
        this.store = store;
        this.uuid = uuid;
    }

    static fromString<T extends DataBlock>(value: unknown) {
        const parts = typeof value === "string" ? value.split(":") : [];
        if (parts.length === 3) return new this<T>(parts[0], parts[1], parts[2]);
    }

    get data() {
        return BlockStore.blocks[this.store].getByUUID(this.uuid) as Promise<T>;
    }

    toString() {
        return `${this.collection}:${this.store}:${this.uuid}`;
    }
}
