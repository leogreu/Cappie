import type { DataBlock, FieldDefinition } from "./data-block.ts";

export class BlockStore {
    static blocks: {
        [storeName: string]: typeof DataBlock;
    } = {};

    static pendingBlocks: {
        [uuid: string]: Promise<DataBlock | undefined>;
    } = {};

    static referencedBlocks: {
        [referencedStoreName: string]: {
            [referencingStoreName: string]: {
                [referencingFieldName: string]: FieldDefinition;
            };
        };
    } = {};

    static transactionData: {
        [parentUUID: string]: {
            [storeName: string]: Record<string, unknown>[];
        }
    } = {};

    /**
     * This method is used to add a block to the list of defined blocks. Using this method
     * ensures that there is an audit block added to the respective collection, if enabled.
     * Moreover, it will ensure that block policies for audit trail access are copied and
     * that a plain dictionary with referenced blocks is created (used primarily for cascade
     * or unset deletion handling by both IndexedDB and PostgreSQL).
     */
    static addBlock(storeName: string, constructor: typeof DataBlock) {
        this.blocks[storeName] ??= constructor;

        for (const [fieldName, fieldDefinition] of Object.entries(constructor.fields)) {
            if (!fieldDefinition.relation) continue;

            for (const relation of [fieldDefinition.relation].flat()) {
                if (!relation.definition) continue;

                const stores = (this.referencedBlocks[relation.definition.store] ??= {});
                const fields = (stores[constructor.definition.store] ??= {});
                fields[fieldName] = fieldDefinition;
            }
        }
    }
}
