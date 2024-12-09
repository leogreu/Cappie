import { BlockStore } from "persistence/block-store.ts";
import { BlockReference, DataBlock } from "persistence/data-block.ts";
import { QueryStore } from "persistence/query/query-store.ts";
import { CRUDMethods } from "persistence/query/live-query.ts";
import type { BlockDefinition } from "persistence/data-block.ts";

/*
    This methods updates blocks that reference a deleted block so that they no longer
    reference that deleted block. This is usually initiated by a PersistanceAdapter
    since the adapter has unconstrained database access.
    TODO: Since the ServerAdapter would not use this method to let the PostgresAdapter
    handle it, local data within the app would not be updated. It could be a solution
    to add a local property to the adapter so that it's always executed but only applies
    to blocks having a adapter with local=true.
    TODO: For this it would make sense to use an abstract PersistanceAdapter, having
    this method to be inherited as well as a static local property. However, TS
    currently does not support abstract static properties or methods.
*/
export const updateReferencingParents = async (definition: BlockDefinition, uuid: string) => {
    const referencingBlocks = BlockStore.referencedBlocks[definition.store];
    if (!referencingBlocks) return;

    const blockReference = new BlockReference(definition.collection, definition.store, uuid).toString();
    for (const [referencingStore, referencingFields] of Object.entries(referencingBlocks)) {
        const referencingBlock = BlockStore.blocks[referencingStore];

        for (const [fieldName, fieldDefinition] of Object.entries(referencingFields)) {
            if (fieldDefinition.delete === "cascade") {
                // TODO: Fetching data just for deletion is very inefficient, therefore add
                // an option to call block.where().equals().delete() for bulk deletion
                const result = await referencingBlock.where(fieldName).equals(blockReference).all({ raw: true });
                for (const parent of result) {
                    const key = referencingBlock.deriveKey(parent);
                    referencingBlock.adapter.deleteObject(referencingBlock.definition, key);
                    QueryStore.dispatchDataChange({
                        store: referencingBlock.definition.store,
                        method: CRUDMethods.DELETE,
                        state: { uuid: parent.uuid }
                    });
                }
            } else if (fieldDefinition.delete === "unset") {
                const result = await referencingBlock.where(fieldName).equals(blockReference).all({ raw: true });
                for (const parent of result) {
                    const value = Reflect.get(parent, fieldName);
                    if (Array.isArray(value)) {
                        Reflect.set(parent, fieldName, value.filter(entry => entry !== blockReference));
                    } else if (value === blockReference) {
                        Reflect.deleteProperty(parent, fieldName);
                    }

                    referencingBlock.adapter.setObject(referencingBlock.definition, parent);
                    QueryStore.dispatchDataChange({
                        store: referencingBlock.definition.store,
                        method: CRUDMethods.UPDATE,
                        state: parent
                    });
                }
            }
        }
    }
}

/**
 * This method recursively creates an object containing all serialized blocks that
 * are referenced in a given root block. This can be used to pass an entire block
 * hierarchy to the client, currently used for surveys. 
 * @param block The root block from which all referenced blocks are recursively serialized
 * and returned.
 */
export const getBlockData = <T extends DataBlock>(
    block: T,
    blockData: Record<string, Record<string, unknown>> = {}
) => {
    // First, serialize and add the current root to the block data
    blockData[block.toString()] = block.toObject();

    // Second, search for referenced blocks and recursively add them as well
    for (const key of Object.keys(block)) {
        const value = Reflect.get(block, key);
        for (const entry of [value].flat()) {
            if (entry instanceof DataBlock) {
                blockData = getBlockData(entry, blockData);
            }
        }
    }

    return blockData;
}
