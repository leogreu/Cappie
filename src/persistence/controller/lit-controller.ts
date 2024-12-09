import { property } from "lit/decorators.js";
import { decorateProperty } from "@lit/reactive-element/decorators.js";
import type { ReactiveElement, ReactiveController, ReactiveControllerHost } from "lit";
import type { Collection } from "../query/query.ts";
import type { DataBlock } from "../data-block.ts";
import type { LiveQuery, QueryCallback } from "../query/live-query.ts";

export function all<T extends typeof DataBlock>(query: Collection<T> | (() => Collection<T>)) {
    return decorateQueryProperty(query, false);
}

export function first<T extends typeof DataBlock>(query: Collection<T> | (() => Collection<T>)) {
    return decorateQueryProperty(query, true);
}

function decorateQueryProperty<T extends typeof DataBlock>(query: Collection<T> | (() => Collection<T>), first: boolean) {
    return decorateProperty({
        finisher: (constructor: typeof ReactiveElement, name: PropertyKey) => {
            constructor.addInitializer((element: ReactiveElement) => {
                property({ attribute: false })(element, name);
                const collection = typeof query === "function" ? query() : query;
                new BlockController(element, name, collection, first);
            });
        }
    });
}

// Main reactive block controller
export class BlockController<T extends typeof DataBlock> implements ReactiveController {
    host: ReactiveControllerHost;
    name: PropertyKey;
    liveQuery?: LiveQuery<InstanceType<T>>;

    callback: QueryCallback<InstanceType<T>> = (result: InstanceType<T> | InstanceType<T>[]) => {
        this.host.updateComplete.then(() => {
            Reflect.set(this.host, this.name, result);
        });
    };

    constructor(host: ReactiveControllerHost, name: PropertyKey, collection: Collection<T>, first: boolean) {
        (this.host = host).addController(this);
        this.name = name;

        this.startLiveQuery(collection, first);
    }

    async startLiveQuery(collection: Collection<T>, first: boolean) {
        this.liveQuery = first
            ? await collection.first(this.callback)
            : await collection.all(this.callback);
    }

    hostConnected() {
        // TODO: Evaluate whether to start live query here instead of constructor
    }

    hostDisconnected() {
        this.liveQuery?.removeCallback(this.callback);
    }
}
