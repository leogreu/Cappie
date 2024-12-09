import { getDifference } from "utils/objects.ts";
import { DataBlock, field } from "./data-block.ts";
import type { BlockDefinition, BlockReference, FieldDefinition } from "./data-block.ts";
import type { Policy } from "./authorization/policies.ts";
import type { CRUDTypes } from "./query/live-query.ts";

export type RawData<T extends DataBlock> = {
    [K in keyof T as T[K] extends Function ? never : K]: T[K] extends DataBlock | BlockReference<DataBlock>
        ? string
        : T[K] extends DataBlock | BlockReference<DataBlock> | undefined
            ? string | undefined
            : T[K] extends DataBlock[] | BlockReference<DataBlock>[]
                ? string[]
                : T[K] extends DataBlock[] | BlockReference<DataBlock>[] | undefined
                    ? string[] | undefined
                    : T[K];
};

// TODO: Any option to combine / merge AuditRecord with AuditData + AuditFields?
export type AuditData<T extends DataBlock> = RawData<T>
    & { [K in keyof AuditRecord as AuditRecord[K] extends Function ? never : K]: AuditRecord[K] };

export type DataDifference = AuditData<any> & {
    store: string;
    previous: Record<string, unknown>;
    current: Record<string, unknown>;
};

export class AuditRecord {
    static readonly collectionName = "audit";
    static fields: Record<string, FieldDefinition> = {};

    @field({ index: true })
    method: CRUDTypes;

    @field({ type: Number, index: true })
    timestamp: number;

    @field()
    reason?: string;

    constructor(method: CRUDTypes, reason?: string) {
        this.method = method;
        this.timestamp = Date.now();
        this.reason = reason;
    }

    static fromBlock(constructor: typeof DataBlock) {
        // Ensure that there is no field defined as key or unique (using an index for key instead)
        const blockFields = Object.fromEntries(
            Object.entries(constructor.fields)
                .map(([name, { key, index, type, relation, group }]) => {
                    return [name, { index: key || index, type, relation, group }];
                })
        );

        // Return new DataBlock extension in AuditRecord shape
        return class extends DataBlock {
            // Ensure audit record fields are added to the beginning to allow schema amendments
            static fields: Record<string, FieldDefinition> = {
                ...AuditRecord.fields,
                ...blockFields
            };

            static definition: BlockDefinition = {
                collection: AuditRecord.collectionName,
                store: constructor.definition.store,
                global: constructor.definition.global,
                auto: true,
                snapshot: true
            };

            static adapter = constructor.adapter;
        };
    }

    static getDifferences = (
        constructor: typeof DataBlock,
        records: AuditData<any>[],
        keys: string[]
    ) => {
        // First, create groups using either the uuid or a compound primary key
        // TODO: Should use Map or Object.groupBy() when available
        const groups = records.reduce<Map<string, Set<AuditData<any>>>>((result, record) => {
            const key = Object.values(constructor.deriveKey(record)).join();
            return result.set(key, (result.get(key) ?? new Set()).add(record));
        }, new Map());

        // Then, create data differences for each group
        const { definition: { store }} = constructor;
        const differences: DataDifference[] = [];
        for (const group of groups.values()) {
            Array.from(group).forEach((record, index, groupRecords) => {
                const difference = getDifference(groupRecords[index - 1] ?? {}, record, keys);
                const previous: DataDifference["previous"] = {};
                const current: DataDifference["current"] = {};

                for (const key of Object.keys(difference)) {
                    previous[key] = difference[key];
                    current[key] = record[key];
                }

                differences.push(Object.assign(record, { store, previous, current }));
            });
        }

        // Finally, sort by timestamp and return
        return differences.sort((a, b) => a.timestamp - b.timestamp);
    }

    static derivePolicies(policies: Policy[]) {
        // Copy policies and ensure that no one includes write access, audits can only be read
        return policies
            .filter(policy => !policy.check)
            .map<Policy>(policy => ({ ...policy, command: "SELECT" }));
    }

    with(data: Record<string, unknown>) {
        const { method, timestamp, reason } = this;
        return Object.assign({ method, timestamp, reason }, data);
    }
}
