import type { BlockDefinition } from "../data-block.ts";
import type { QueryResult } from "../query/query.ts";

export interface PersistenceAdapter {
    getObject: (
        definition: BlockDefinition,
        key: Record<string, string>,
    ) => Promise<Record<string, unknown> | undefined>;

    setObject: (
        definition: BlockDefinition,
        value: Record<string, unknown>,
        reason?: string
    ) => Promise<void>;

    setObjects: (
        definition: BlockDefinition,
        values: Record<string, unknown>[],
        reasons?: (string | undefined)[]
    ) => Promise<void>;

    deleteObject: (
        definition: BlockDefinition,
        key: Record<string, string>,
        reason?: string
    ) => Promise<void>;

    executeQuery: (
        queryResult: QueryResult
    ) => Promise<Record<string, unknown> | Record<string, unknown>[]>;

    registerLiveQuery?: (
        queryResult: QueryResult
    ) => void;

    unregisterLiveQuery?: (
        queryResult: QueryResult
    ) => void;
}
