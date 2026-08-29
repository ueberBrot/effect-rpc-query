# Let call sites choose query or mutation

Every non-streaming unary RPC leaf exposes `queryOptions` and `mutationOptions`, and the call site chooses the TanStack semantics. Effect RPC contracts do not label operations as reads or writes, so required classification would duplicate the contract; an optional branded classification can be added later without restricting the base RPC utility tree. Streaming leaves, and branches emptied by their omission, appear in neither the inferred nor runtime tree; leaves expose no direct execution helper.
