import { LiveQuery, type QueryCallback, type CRUDTypes } from "./live-query.ts";
import type { BlockDefinition, DataBlock } from "../data-block.ts";
import type { QueryResult } from "./query.ts";

export type DataStateMessageEvent = {
    store: string;
    method: CRUDTypes;
    state: Record<string, unknown>;
};

export class QueryStore {
    static liveQueries: LiveQuery<any>[] = [];
    static dataChannel = new BroadcastChannel("data-state");

    static init() {
        this.dataChannel.onmessage = (event: MessageEvent<DataStateMessageEvent>) => {
            QueryStore.evaluateDataChange(event.data);
        };
    }

    static executeQuery<T extends DataBlock>(queryResult: QueryResult): Promise<T | T[] | undefined>
    static executeQuery<T extends DataBlock>(queryResult: QueryResult, callback: QueryCallback<T>): Promise<LiveQuery<T>>
    static async executeQuery<T extends DataBlock>(queryResult: QueryResult, callback?: QueryCallback<T>) {
        return callback
            ? this.executeLiveQuery(queryResult, callback)
            : this.executeSimpleQuery(queryResult);
    }

    static executeLiveQuery<T extends DataBlock>(queryResult: QueryResult, callback: QueryCallback<T>) {
        // If an equivalent live query exists, add callback
        const liveQuery = this.liveQueries.find(query => {
            return query.queryResult.toString() === queryResult.toString();
        });

        // Otherwise, start a new live query
        return liveQuery
            ? liveQuery.addCallback(callback)
            : new LiveQuery(queryResult, callback).start();
    }

    static async executeSimpleQuery(queryResult: QueryResult) {
        // If an equivalent live query holds the requested data, return it
        const liveQuery = this.liveQueries.find(query => {
            return query.queryResult.toString() === queryResult.toString();
        });

        if (liveQuery && liveQuery.dataCache.length) {
            // TODO: This should be able to wait on a cache pending state to resolve
            return liveQuery.queryResult.first ? liveQuery.dataCache.at(0) : liveQuery.dataCache;
        }

        // For simple queries fetching one entry with one equality filter, search in live queries
        const { first, where, projectUUID, block } = queryResult;
        if (first && where.length === 1) {
            const [{ field, value, operator }] = where;
            const result = operator === "="
                && this.getLiveQueryBlock(block, field, value, projectUUID);

            if (result) return result;
        }

        // Otherwise, fetch, parse, and return data
        const result = await block.adapter.executeQuery(queryResult);
        if (result) {
            return Array.isArray(result)
                ? Promise.all(result.map(entry => block.fromObject(entry)))
                : block.fromObject(result);
        } else {
            // Return null to identify a finished but empty query
            return null;
        }
    }

    static registerLiveQuery<T extends DataBlock>(liveQuery: LiveQuery<T>) {
        liveQuery.queryResult.block.adapter.registerLiveQuery?.(liveQuery.queryResult);
        this.liveQueries.push(liveQuery);
    }

    static unregisterLiveQuery<T extends DataBlock>(liveQuery: LiveQuery<T>) {
        const index = this.liveQueries.indexOf(liveQuery);
        if (!index) return;

        this.liveQueries.splice(index, 1);
        liveQuery.queryResult.block.adapter.unregisterLiveQuery?.(liveQuery.queryResult);
    }

    static dispatchDataChange(data: DataStateMessageEvent, force = false) {
        if (force) {
            // Ensure that a local change will be detected and a render triggered
            data.state = { ...data.state, commitTimestamp: Date.now() };
        }

        this.dataChannel.postMessage(data);
        this.evaluateDataChange(data, !force);
    }

    static evaluateDataChange(data: DataStateMessageEvent, debounce = true) {
        this.liveQueries.forEach(liveQuery => {
            liveQuery.evaluateDataChange(data, debounce);
        });
    }

    static getLiveQueryBlock(block: typeof DataBlock, key: string, value: unknown, projectUUID?: string) {
        for (const liveQuery of this.liveQueries) {
            if (
                liveQuery.queryResult.block.definition.collection === block.definition.collection
                && liveQuery.queryResult.projectUUID === projectUUID
            ) {
                const match = liveQuery.find(block, key, value);
                if (match) return match;
            }
        }
    }
}

QueryStore.init();
