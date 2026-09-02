---
title: Handle Failures
description: Inspect RPC Causes and distinguish configuration and key errors.
---

A failed RPC `Exit` becomes `EffectRpcQueryError`. The error records the RPC tag, whether a query or
mutation ran, and the complete Effect `Cause`:

```ts
import { Cause } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'

const logRpcError = (error: unknown) => {
  if (isEffectRpcQueryError(error)) {
    console.error(error.rpcTag, error.operation)
    console.error(Cause.pretty(error.cause))
  }
}
```

Three error classes mark different boundaries:

- `EffectRpcQueryConfigError` reports invalid factory input before a utility tree is returned.
- `EffectRpcQueryKeyError` reports synchronous payload construction, encoding, or JSON
  canonicalization failures.
- `EffectRpcQueryError` reports a failed RPC execution and preserves its Effect `Cause`.

If a custom runner rejects instead of returning an `Exit`, its rejection passes through unchanged.
See the [error reference](/effect-rpc-query/reference/errors/) for stable codes and metadata.
