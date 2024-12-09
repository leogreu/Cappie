import { DataBlock, BlockReference } from "../data-block.ts";
import { LiveQuery, CRUDTypes } from "./live-query.ts";
import { QueryStore } from "./query-store.ts";

export type ExtendedKey = IDBValidKey | DataBlock | BlockReference<any> | undefined;

/*
A set of classes to store and analyze defined data queries
*/
export class QueryResult {
    uuid: string = crypto.randomUUID();
    projectUUID: string | undefined;
    block: typeof DataBlock;

    where: WhereResult[] = [];
    sort: SortResult[] = [];

    // TODO: Use limit or count instead?
    first = false;

    constructor(block: typeof DataBlock) {
        this.block = block;

        // Use the auth project as default for project-specific (i.e., non-global) data
        if (!block.definition.global) {
            this.projectUUID = String();
        }
    }

    // TODO: Implement more efficient approach to compare (live) queries
    toString() {        
        const searchParams = [
            ...this.where.map(entry => [entry.field, entry.value as string]),
            ...this.sort.map(entry => ["sort." + entry.type, entry.field])
        ];

        if (this.projectUUID) {
            searchParams.push(["project", this.projectUUID]);
        }

        if (this.first) {
            searchParams.push(["first", "true"]);
        }

        return this.block.definition.store
            + (searchParams.length ? "?" : "")
            + new URLSearchParams(searchParams).toString();
    }

    // Evaluates whether a query is impacted on the top level by an insert or update
    // TODO: Here and in WhereResult, type DataBlock and .toString() really required?
    dataDoesMatch(store: string, data: DataBlock | Record<string, unknown>) {
        if (
            this.block.definition.store !== store
            || (this.projectUUID && this.projectUUID !== data.project)
        ) {
            // Store must match and, if project-specific, the project uuid too
            return false;
        }

        return this.where.length
            ? this.where.every(entry => entry.dataDoesMatch(data))
            : true;
    }
}

export class WhereResult {
    field: string;
    operator: "=" | "!=" | ">=" | "<=" | "in" | "any" | "between";
    value: IDBValidKey | undefined;
    union: "and" | "or" | undefined;

    constructor(field: string, operator: WhereResult["operator"], value?: IDBValidKey, union?: WhereResult["union"]) {
        this.field = field;
        this.operator = operator;
        this.value = value;
        this.union = union;
    }

    dataDoesMatch(data: DataBlock | Record<string, unknown>) {
        let value = Reflect.get(data, this.field);
        value = value instanceof DataBlock ? value.toString() : value;

        switch (this.operator) {
            case "=":
                return this.value === value;
            case "!=":
                return this.value !== value;
            case "any":
                return Array.isArray(this.value) && this.value.includes(value);
        }
    }
}

export class SortResult {
    field: string;
    type: "asc" | "desc";

    constructor(field: string, type: SortResult["type"]) {
        this.field = field;
        this.type = type;
    }
}

/*
A set of classes to formulate and execute data queries
*/
export class Query<T extends typeof DataBlock> {
    protected result: QueryResult;

    constructor(block: T) {
        this.result = new QueryResult(block);
    }

    where(): Collection<T>
    where(value : string): Where<T>
    where(value: Record<string, ExtendedKey>): Collection<T>
    where(value?: string | Record<string, ExtendedKey>) {
        if (!value) {
            // If no value was specified, skip filtering and return collection
            return new Collection<T>(this.result);
        } else if (value instanceof Object) {
            // For an object with multiple field names and values, add it to the result
            Object.entries(value).forEach(([fieldName, fieldValue]) => {
                if (fieldValue instanceof DataBlock || fieldValue instanceof BlockReference) {
                    fieldValue = fieldValue.toString();
                };

                this.result.where.push(new WhereResult(fieldName, "=", fieldValue, "and"));
            });
            return new Collection<T>(this.result);
        } else {
            // Otherwise, return a new Where-instance for filter specification
            return new Where<T>(value, this.result);
        }
    }
}

export class Where<T extends typeof DataBlock> {
    protected fieldName: string;
    protected result: QueryResult;
    protected union: WhereResult["union"];

    constructor(fieldName: string, result: QueryResult, union?: WhereResult["union"]) {
        this.fieldName = fieldName;
        this.result = result;
        this.union = union;
    }

    protected finalizeWhere(value: ExtendedKey, operator: WhereResult["operator"], union?: WhereResult["union"]) {
        if (value instanceof DataBlock || value instanceof BlockReference) {
            value = value.toString();
        }

        const whereResult = new WhereResult(this.fieldName, operator, value, union);
        this.result.where.push(whereResult);
    }

    equals(value: ExtendedKey) {
        this.finalizeWhere(value, "=", this.union);
        return new Collection<T>(this.result);
    }

    notEquals(value: ExtendedKey) {
        this.finalizeWhere(value, "!=", this.union);
        return new Collection<T>(this.result);
    }

    greaterThan(value: ExtendedKey) {
        this.finalizeWhere(value, ">=", this.union);
        return new Collection<T>(this.result);
    }

    lowerThan(value: ExtendedKey) {
        this.finalizeWhere(value, "<=", this.union);
        return new Collection<T>(this.result);
    }

    includes(value: ExtendedKey) {
        this.finalizeWhere(value, "in", this.union);
        return new Collection<T>(this.result);
    }

    equalsAny(values: IDBValidKey[]): Collection<T> {
        this.finalizeWhere(values, "any", this.union);
        return new Collection<T>(this.result);
    }

    between(from: IDBValidKey, to: IDBValidKey) {
        this.finalizeWhere([from, to], "between", this.union);
        return new Collection<T>(this.result);
    }
}

export class Sort<T extends typeof DataBlock> {
    protected fieldName: string;
    protected result: QueryResult;

    constructor(fieldName: string, result: QueryResult) {
        this.fieldName = fieldName;
        this.result = result;
    }

    protected finalizeSort(type: SortResult["type"]) {
        const sortResult = new SortResult(this.fieldName, type)
        this.result.sort.push(sortResult);
    }

    asc() {
        this.finalizeSort("asc");
        return new Collection<T>(this.result);
    }

    desc() {
        this.finalizeSort("desc");
        return new Collection<T>(this.result);
    }
}

export class Collection<T extends typeof DataBlock> {
    protected result: QueryResult;

    constructor(result: QueryResult) {
        this.result = result;
    }

    sort(fieldName: string) {
        return new Sort<T>(fieldName, this.result);
    }

    or(fieldName: string) {
        // Implementation requires more elaborate dataDoesMatch() logic
        // return new Where<T>(fieldName, this.result, "or");
    }
    
    and(fieldName: string) {
        return new Where<T>(fieldName, this.result, "and");
    }

    project(uuid?: string) {
        this.result.projectUUID = uuid;
        return this;
    }

    all(): Promise<InstanceType<T>[]>;
    all(callback: (data: InstanceType<T>[], updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void): Promise<LiveQuery<InstanceType<T>>>;
    all(optionsOrCallback?: { raw: boolean } | ((data: InstanceType<T>[], updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void)) {
        return this.executeQuery(optionsOrCallback);
    }

    first(): Promise<InstanceType<T> | undefined>;
    first(callback: (data?: InstanceType<T>, updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void): Promise<LiveQuery<InstanceType<T>>>;
    first(optionsOrCallback?: { raw: boolean } | ((data: InstanceType<T>, updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void)) {
        this.result.first = true;
        return this.executeQuery(optionsOrCallback);
    }

    private executeQuery(
        optionsOrCallback?: { raw: boolean }
        | ((data: InstanceType<T>[], updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void)
        | ((data: InstanceType<T>, updatedBlock?: InstanceType<T>, crud?: CRUDTypes) => void)
    ) {
        if (typeof optionsOrCallback === "object" && optionsOrCallback.raw) {
            return this.result.block.adapter.executeQuery(this.result);
        } else if (typeof optionsOrCallback === "function") {
            return QueryStore.executeQuery<InstanceType<T>>(this.result, optionsOrCallback);
        } else {
            return QueryStore.executeQuery<InstanceType<T>>(this.result);
        }
    }
}
