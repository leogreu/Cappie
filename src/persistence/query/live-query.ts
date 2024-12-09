import { debounce } from "utils/debounce.ts";
import { BlockStore } from "../block-store.ts";
import { DataBlock, BlockReference } from "../data-block.ts";
import { QueryStore, type DataStateMessageEvent } from "./query-store.ts";
import type { QueryResult } from "./query.ts";

export const CRUDMethods = {
    INSERT: "INSERT",
    UPDATE: "UPDATE",
    DELETE: "DELETE"
} as const;

export type CRUDTypes = typeof CRUDMethods[keyof typeof CRUDMethods];

// TODO: Evaluate how to replace any while being able to type all() and first() callbacks
export type QueryCallback<T extends DataBlock> = (
    (data: any, updatedBlock?: T, crud?: CRUDTypes) => void
);

export class LiveQuery<T extends DataBlock> {
    queryResult: QueryResult;
    callbacks: QueryCallback<T>[] = [];
    dataCache: T[] = [];

    constructor(queryResult: QueryResult, callback: QueryCallback<T>) {
        this.queryResult = queryResult;
        this.callbacks.push(callback);
    }

    async start() {
        // First, register live query so that concurrently started live queries can be merged
        QueryStore.registerLiveQuery(this);
        
        // Second, execute the query and the assigned callbacks thereafter
        await this.executeQuery();
        this.executeCallbacks();

        return this;
    }

    async executeQuery() {
        this.dataCache = [await QueryStore.executeQuery(this.queryResult)].flat()
            .filter((entry): entry is T => !!entry);
    }

    executeCallbacks(updatedBlock?: T, crud?: CRUDTypes) {
        const data = this.queryResult.first ? this.dataCache.at(0) : this.dataCache;
        this.callbacks.forEach(callback => callback(data, updatedBlock, crud));
    }

    debounceCallbacks = debounce(this.executeCallbacks.bind(this), 50);

    async evaluateDataChange({ store, method, state }: DataStateMessageEvent, debounce?: boolean) {
        const previousData = store === this.queryResult.block.definition.store
            && this.dataCache.find(entry => entry.uuid === state.uuid);

        const queryMatch = this.queryResult.dataDoesMatch(store, state);

        // If there's previous data that doesn't match the query anymore, it must be removed
        method = previousData && !queryMatch ? "DELETE" : method;

        // 1. Evaluate whether data change affected top-level query
        if (previousData || queryMatch) {
            // 1.1. Selectively update existing cache
            let updatedBlock: T | undefined;
            switch (method) {
                case CRUDMethods.INSERT:
                    // Use UPDATE for INSERT too, since a locally created block will exist in the
                    // data cache already, but will still be returned by the PostgreSQL database.
                    // This ensures new data isn't shown twice, while providing optimistic updates
                case CRUDMethods.UPDATE:
                    if (previousData) {
                        updatedBlock = await this.selectivelyAdoptChanges(previousData, this.parseReferences(store, state)) as T;
                        this.dataCache = this.dataCache.map(entry => entry.uuid === updatedBlock?.uuid ? updatedBlock : entry);
                    } else {
                        updatedBlock = await this.queryResult.block.fromObject(state) as T;
                        this.dataCache = [...this.dataCache, updatedBlock];
                    }
                    break;
                case CRUDMethods.DELETE:
                    this.dataCache = this.dataCache.filter(entry => entry.uuid !== state.uuid);
                    break;
            }

            // 1.2. Ensure correct sorting (reverse to sort latter clause within the prior group)
            for (const sort of [...this.queryResult.sort].reverse()) {
                this.dataCache.sort((a: any, b: any) => {
                    return sort.type === "asc"
                        ? a[sort.field] > b[sort.field] ? 1 : (a[sort.field] < b[sort.field] ? -1 : 0)
                        : a[sort.field] < b[sort.field] ? 1 : (a[sort.field] > b[sort.field] ? -1 : 0)
                })
            }

            // 1.3. For first-only queries, remove spare blocks or query next
            if (this.queryResult.first) {
                if (method === CRUDMethods.INSERT) this.dataCache.splice(1);
                else if (method === CRUDMethods.DELETE) await this.executeQuery();

                updatedBlock = this.dataCache.at(0);
            }

            this[debounce ? "debounceCallbacks" : "executeCallbacks"](updatedBlock, method);
        // 2. If query was not affected, evaluate whether it might have been affected further down the tree
        // Note that this only happens for the update method, to prevent an unnecessary and potentially
        // large amount of data creations from being processed (if its down the tree, there must also
        // be at least one element that has been updated in order to show the new data)
        } else if (method === CRUDMethods.UPDATE && typeof state?.uuid === "string") {
            if (!this.find(BlockStore.blocks[store], "uuid", state.uuid)) {
                return;
            }

            state = this.parseReferences(store, state);
            this.dataCache = await Promise.all(
                this.dataCache.map(entry => this.recursivelyInsertData(entry, state))
            ) as T[];

            // TODO: Pass updated block(s) to callback
            this[debounce ? "debounceCallbacks" : "executeCallbacks"]();
        }
    }

    /*
        A fast method for recursively finding the first matching block based on a root node
    */
    find(block: typeof DataBlock, key: string, value: unknown) {
        for (const entry of this.dataCache) {
            const match = entry.find(block, key, value);
            if (match) return match;
        }
    }

    /*
        This method recursively traverses the cache tree and searches for a data block to update. Once found,
        it updates the block and returns it. On the way upwards, it replaces the path to the updated block
        in an immutable manner for an efficient component re-rendering.
    */
    async recursivelyInsertData(block: DataBlock, data: Record<string, unknown>, visited: Record<string, DataBlock> = {}) {
        if (block.uuid === data.uuid) {
            // Stop condition 1: Check if current block equals updated data, adopt changes, return
            return await this.selectivelyAdoptChanges(block, data);
        } else if (block.uuid in visited) {
            // Stop condition 2: Check if current block was updated before (happens, e.g., when a
            // form is referenced in multiple events) and thus return the previously updated block.
            // Only returning the block is not sufficient here, since it will have a new immutable
            // copy somewhere, created previously. Using getBlockByUUID(), unfortunately, does not
            // work either, since it still holds the old references further up the tree. Therefore,
            // a new visited dictionary is used with references to visited (and updated) blocks.
            return visited[block.uuid];
        }

        // Create a copy of the block with potentially updated children, which are then selectively adopted upwards
        const updatedBlock: Record<string, unknown> = {};
        for (const field of Object.keys(block)) {
            const value = Reflect.get(block, field);

            if (Array.isArray(value)) {
                // Ensure a depth-first search instead of a breadth-first search (i.e., no use of
                // updatedBlock[field] = await Promise.all(value.map(...)) to ensure that blocks
                // which are referenced multiple times are fully updated, added to the visited
                // and can thus be reused by other referencing instances.
                const updatedEntries = [];
                for (const entry of value) {
                    const updatedEntry = entry instanceof DataBlock
                        ? await this.recursivelyInsertData(entry, data, visited)
                        : entry;

                    updatedEntries.push(updatedEntry);
                }

                updatedBlock[field] = updatedEntries;
            } else {
                updatedBlock[field] = value instanceof DataBlock
                    ? await this.recursivelyInsertData(value, data, visited)
                    : value;
            }
        }

        return (visited[block.uuid] = await this.selectivelyAdoptChanges(block, updatedBlock));
    }

    /*
        This method receives a DataBlock and a data object with BlockReferences having some new data and
        returns a new, updated DataBlock with minimal data fetching, i.e., by reusing data where possible.
        Only return new block if values were changed to prevent unnecessary replacements on upwards recursion.
    */
    async selectivelyAdoptChanges(block: DataBlock, data: Record<string, unknown>) {
        const changedFields: string[] = [];
        for (const field of Object.keys(data)) {
            const previousValue = Reflect.get(block, field);
            const currentValue = data[field];

            if (Array.isArray(currentValue)) {
                (currentValue.length !== previousValue?.length
                    || currentValue.some((entry, index) => {
                        return entry instanceof BlockReference
                            ? entry.uuid !== previousValue?.[index].uuid
                            : entry !== previousValue?.[index];
                    }))
                && changedFields.push(field);

                data[field] = changedFields.includes(field)
                    ? await Promise.all(
                        currentValue?.map(async currentEntry => {
                            return currentEntry instanceof BlockReference
                                ? previousValue
                                    .find((previousEntry: DataBlock) => {
                                        return previousEntry.uuid === currentEntry.uuid;
                                    })
                                    ?? await currentEntry.data
                                : currentEntry;
                        })
                    )
                    : previousValue;
            } else {
                (currentValue instanceof BlockReference
                    ? currentValue.uuid !== previousValue?.uuid
                    : currentValue !== previousValue)
                && changedFields.push(field);

                data[field] = changedFields.includes(field)
                    ? currentValue instanceof BlockReference
                        ? await currentValue.data
                        : currentValue
                    : previousValue;
            }
        }

        if (changedFields.length) {
            data.internal = Reflect.get(block, "internal");
            return Object.assign(new (block.constructor as typeof DataBlock), data);
        } else {
            return block;
        }
    }

    // Transform reference strings to BlockReference objects, required by selectivelyAdoptChanges,
    // while using structuredClone to ensure that a given object will not be modified
    // TODO: Evaluate other, perhaps more simpler, concise, and performant approaches
    parseReferences(store: string, data: Record<string, unknown>) {
        data = structuredClone(data);
        for (const [key, value] of Object.entries(data)) {
            if (!BlockStore.blocks[store]?.fields[key]?.relation) continue;

            data[key] = Array.isArray(value)
                ? value.map(entry => BlockReference.fromString(entry) ?? entry)
                : BlockReference.fromString(value) ?? value;
        }

        return data;
    }

    addCallback(callback: QueryCallback<T>) {
        this.callbacks.push(callback);

        // If the data is not undefined (i.e., was set, also when null), execute callback
        const data = this.queryResult.first ? this.dataCache.at(0) : this.dataCache;
        if (data !== undefined) callback(data);
    
        return this;
    }

    removeCallback(callback: QueryCallback<T>) {
        this.callbacks.splice(this.callbacks.indexOf(callback), 1);
        if (!this.callbacks.length) QueryStore.unregisterLiveQuery(this);
    }
}
