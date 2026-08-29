# Use flat prefix-matchable key tuples

Generated keys concatenate a required readonly, non-empty JSON prefix, the RPC path, an operation discriminator, and a canonical query payload when present. Root, branch, RPC, and operation keys therefore support TanStack's native array-prefix matching; mutation variables remain outside `mutationKey` because they arrive after option construction. Concrete query keys use TanStack's `DataTag` for typed cache access, while prefix and mutation keys remain ordinary readonly keys and callers compose TanStack filters themselves.
