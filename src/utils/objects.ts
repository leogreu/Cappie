export const getDifference = (
    from: Record<string, unknown>,
    to: Record<string, unknown>,
    keys: string[]
) => {
    return keys.reduce((result: Record<string, unknown>, key: string) => {
        // Use nullish coalescing to not differentiate between null and undefined
        return JSON.stringify(from[key] ?? null) !== JSON.stringify(to[key] ?? null)
            ? { ...result, [key]: from[key] }
            : result;
    }, {});
};
