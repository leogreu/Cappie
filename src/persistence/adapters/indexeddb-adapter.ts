import { BlockStore } from "../block-store.ts";
import { DataBlock, BlockDefinition } from "../data-block.ts";
import { QueryResult } from "../query/query.ts";
import { updateReferencingParents } from "./adapter-utilities.ts";
import type { PersistenceAdapter } from "./persistence-adapter.ts";

interface IndexedDBExtension {
    blockDatabases: Record<string, Promise<IDBDatabase>>;
    getDatabase: (definition: BlockDefinition) => Promise<IDBDatabase>;
    getDatabaseBlocks: (definition: BlockDefinition) => typeof DataBlock[];
    handleOnUpgradeNeeded: (request: IDBOpenDBRequest, blocks: typeof DataBlock[]) => void;
    getObjectStore: (definition: BlockDefinition, writeable: boolean) => Promise<IDBObjectStore>;
    promisifyRequest: <T>(request: IDBRequest) => Promise<T>;
    deleteProject: () => Promise<void>;
}

export const IndexedDBAdapter: PersistenceAdapter & IndexedDBExtension = {
    blockDatabases: {},

    getObject: async function(definition, key) {
        const store = await this.getObjectStore(definition, false);
        return this.promisifyRequest(store.get(Object.values(key)));
    },

    setObject: async function(definition, value, reason) {
        // Insert or update data
        const store = await this.getObjectStore(definition, true);
        await this.promisifyRequest(store.put(value));
    },

    setObjects: async function(definition, values, reasons) {
        for (let i = 0; i < values.length; i++) {
            await this.setObject(definition, values[i], reasons?.[i]);
        }
    },

    deleteObject: async function(definition, key, reason) {
        // For audited blocks, fetch and log the deleted, i.e. old, data
        const oldData = definition.audit && await this.getObject(definition, key);

        // Delete data and maintain consistency in relations
        const store = await this.getObjectStore(definition, true);
        await this.promisifyRequest(store.delete(Object.values(key)));
        await updateReferencingParents(definition, key.uuid);
    },

    executeQuery: async function(queryResult) {
        const store = await this.getObjectStore(queryResult.block.definition, false);
        const count = queryResult.first ? 1 : undefined;

        // IndexedDB doesn't index null / undefined, thus exclude those where's and apply later
        const where = queryResult.where.filter(entry => !(entry.operator === "=" && !entry.value));

        let result: Record<string, unknown>[] = [];
        if (where.length) {
            if (where.length > 1) {
                // Get the grouped compound index name and keys for multiple where-clauses
                const groupNames = where.map(entry => {
                    return queryResult.block.fields[entry.field].group;
                });

                if (groupNames.every(entry => entry && entry === groupNames[0])) {
                    // Adding an empty array to the upperBound allows querying
                    // an compound index with a shorter array
                    const indexName = groupNames[0] as string;
                    const keyValues = where.map(entry => entry.value);
                    const query = IDBKeyRange.bound(keyValues, [...keyValues, []]);
                    result = await this.promisifyRequest<Record<string, unknown>[]>(
                        store.index(indexName).getAll(query, count)
                    );
                } else {
                    // If no compound index is available, use a slower recursive combination
                    const results = await Promise.all(where.map(entry => {
                        const query = new QueryResult(queryResult.block);
                        query.first = queryResult.first;
                        query.where.push(entry);

                        return this.executeQuery(query);
                    }));

                    // Merge results, while currently supporting the and union type only
                    result = [results[0]].flat();
                    result = result.filter(entry => results.slice(1)
                        .every(set => [set].flat().find(record => record.uuid === entry.uuid))
                    );

                    console.debug("Recursive query used for", queryResult.toString());
                }
            } else {
                // Otherwise, use first field name and value as index name and key
                const { field, value, operator } = where[0];
                if (operator === "any" && Array.isArray(value)) {
                    // To improve performance, sort the values to align them with the IDB index
                    // TODO: Evaluate performance and whether this is actually aligned with index
                    value.sort();

                    // TODO: Try to write more concisely and add consider count
                    result = await new Promise<Record<string, unknown>[]>(resolve => {
                        const cursorResult: Record<string, unknown>[] = [];
        
                        let index = 0;
                        store.index(field).openCursor().onsuccess = event => {
                            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
                            if (cursor) {
                                while (cursor.key > value[index]) {
                                    index++;
                                    if (index === value.length) {
                                        return resolve(cursorResult);
                                    }
                                }
                                if (cursor.key === value[index]) {
                                    cursorResult.push(cursor.value);
                                    cursor.continue();
                                } else {
                                    cursor.continue(value[index]);
                                }
                            } else {
                                resolve(cursorResult);
                            }
                        };
                    });
                } else {
                    // If there is only one where-clause, execute the query
                    let query: IDBValidKey | IDBKeyRange | undefined;
                    if (operator === "between" && Array.isArray(value)) {
                        query = IDBKeyRange.bound(value[0], value[1]);
                    } else if (operator === "=" || operator === "in") {
                        query = value;
                    } else if (operator === ">=") {
                        query = IDBKeyRange.lowerBound(value);
                    } else if (operator === "<=") {
                        query = IDBKeyRange.upperBound(value);
                    }

                    result = await this.promisifyRequest<Record<string, unknown>[]>(
                        store.index(field).getAll(query, count)
                    );

                    if (operator === "!=") {
                        result = result.filter(entry => entry[field] !== value);
                    }
                }
            }
        } else if (queryResult.sort.length === 1) {
            // Since we do not have a WHERE clause, we can open a simple cursor on the SORT index
            result = await new Promise<Record<string, unknown>[]>(resolve => {
                const cursorResult: Record<string, unknown>[] = [];
                const index = store.index(queryResult.sort[0].field);
                const direction = queryResult.sort[0].type === "desc" ? "prev" : "next";

                let cursorCount = count;
                index.openCursor(undefined, direction).onsuccess = event => {
                    const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
                    if (cursor) {
                        cursorResult.push(cursor.value);
                        if (!cursorCount || (cursorCount--) >= 1) {
                            cursor.continue();
                        } else {
                            resolve(cursorResult);
                        }
                    } else {
                        resolve(cursorResult);
                    }
                };
            });
        } else {
            // For no where- or sort-clauses, return all entries without using an index
            result = await this.promisifyRequest<Record<string, unknown>[]>(
                store.getAll(undefined, count)
            );
        }

        // If there are both where and sort clauses, sort result manually, since this cannot be
        // achieved otherwise using IndexedDB. The same applies for multiple sort clauses, that
        // are reversed first to sort the latter clause within the prior sort group.
        // TODO: Does it make sense to simply remove the cursor-based sort approach above?
        // TODO: Basically the same is used in LiveQuery, therefore reuse?
        if ((where.length && queryResult.sort.length) || queryResult.sort.length > 1) {
            for (const sort of [...queryResult.sort].reverse()) {
                result.sort((a, b) => {
                    const valueA = Reflect.get(a, sort.field) as number;
                    const valueB = Reflect.get(b, sort.field) as number;
    
                    return sort.type === "asc"
                        ? valueA > valueB ? 1 : (valueA < valueB ? -1 : 0)
                        : valueA < valueB ? 1 : (valueA > valueB ? -1 : 0);
                });
            }
        }

        // Since IndexedDB does not support indexing null / undefined (see above), filter manually
        if (where.length !== queryResult.where.length) {
            const undefinedWheres = queryResult.where
                .filter(entry => entry.operator === "=" && !entry.value);

            for (const undefinedWhere of undefinedWheres) {
                result = result.filter(entry => !Reflect.get(entry, undefinedWhere.field));
            }
        }

        // TODO: Evaluate to always return an array together with QueryResult.count instead if first
        return queryResult.first ? result[0] : result;
    },

    getDatabase: function(definition) {
        // If the database connection is open, return it
        if (this.blockDatabases[definition.collection] !== undefined) {
            return this.blockDatabases[definition.collection];
        }

        // Open the database in the current version and handle onupgradedneeded event
        const blocks = this.getDatabaseBlocks(definition);
        const version = blocks.reduce((count, block) => count + (block.definition.version ?? 1), 0);
        const request = indexedDB.open(definition.collection, version);
        this.handleOnUpgradeNeeded(request, blocks);
        this.blockDatabases[definition.collection] = this.promisifyRequest<IDBDatabase>(request);

        // Handle versionchange, currently only used to close connections on deletion
        this.blockDatabases[definition.collection].then(database => {
            database.onversionchange = (event) => {
                if (!event.newVersion) database.close();
            };
        });

        return this.blockDatabases[definition.collection];
    },

    getDatabaseBlocks: function(definition) {
        return Object.values(BlockStore.blocks)
            .filter(block => block.adapter === this
                && block.definition.collection === definition.collection
            );
    },

    handleOnUpgradeNeeded: function(request: IDBOpenDBRequest, blocks: typeof DataBlock[]) {
        request.onupgradeneeded = () => {
            blocks.forEach(block => {
                if (!request.result.objectStoreNames.contains(block.definition.store)) {
                    // Create table with key index
                    const store = request.result.createObjectStore(block.definition.store, {
                        keyPath: block.definition.auto ? undefined : block.keyPath,
                        autoIncrement: block.definition.auto
                    });
    
                    // Create normal indices
                    Object.entries(block.fields).forEach(([fieldName, fieldDefinition]) => {
                        if (
                            fieldDefinition.key
                            || fieldDefinition.index
                            || fieldDefinition.unique
                            || fieldDefinition.relation
                        ) {
                            store.createIndex(fieldName, fieldName, {
                                unique: fieldDefinition.unique ?? false,
                                multiEntry: true
                            });
                        }
                    });
    
                    // Create grouped compound indices
                    const groups = Object.entries(block.fields).reduce((result, [name, definition]) => {
                        definition.group && (result[definition.group] ??= []).push(name);
                        return result;
                    }, {} as Record<string, string[]>);
                    Object.entries(groups).forEach(([groupName, fieldNames]) => {
                        store.createIndex(groupName, fieldNames);
                    });
                }
            });
        };
    },

    getObjectStore: async function(definition, writeable: boolean) {
        const database = await this.getDatabase(definition);
        return database
            .transaction(definition.store, writeable ? "readwrite" : "readonly")
            .objectStore(definition.store);
    },

    promisifyRequest: function<T>(request: IDBRequest) {
        return new Promise<T>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Check if to add more generic approach to PersistenceAdapter, or listen to Project.delete()
    deleteProject: async function() {
        for (const database of await indexedDB.databases()) {
            if (database.name) {
                await this.promisifyRequest(indexedDB.deleteDatabase(database.name));
            }
        }
    }
}
