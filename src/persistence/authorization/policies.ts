import type { DataBlock } from "persistence/data-block.ts";

export const definedPolicies = new Map<typeof DataBlock, Policy[]>();

export type Policy = {
    name: string;
    command: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
    expression: string;
    check?: string;
};

// Decorator function to define required RLS Policies for block CRUD operations
export function policies(policies: Policy[]) {
    return function(target: typeof DataBlock) {
        definedPolicies.set(target, policies);
    }
}
