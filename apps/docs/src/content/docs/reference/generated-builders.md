---
title: Generated Builders
description: Reference for branch and RPC leaf methods.
---

Every branch and leaf exposes `key()`, which returns its immutable cache-key prefix.

Each unary RPC leaf also exposes:

| Builder                     | Result                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `queryKey(input?)`          | Payload-specific, data-tagged query key. Payload-bearing RPCs require constructor input.                   |
| `queryOptions(options?)`    | Fresh Query Core options with owned `queryFn`, `queryKey`, and `queryKeyHashFn`.                           |
| `mutationKey()`             | Immutable operation key shared by mutations of this RPC.                                                   |
| `mutationOptions(options?)` | Fresh mutation options with owned `mutationFn` and `mutationKey`. Variables arrive when the mutation runs. |

Payloadless query builders take no input. Payload-bearing builders require an `input` field:

```ts
rpcQuery.health.ping.queryOptions()
rpcQuery.users.get.queryOptions({ input: { id: 1 }, staleTime: 30_000 })
```

Disable a payload-bearing query with the exported Query Core sentinel:

```ts
import { skipToken } from 'effect-rpc-query'

const options =
  userId === undefined
    ? rpcQuery.users.get.queryOptions(skipToken)
    : rpcQuery.users.get.queryOptions({ input: { id: userId } })
```

`skipToken` is valid only for payload-bearing query options. It is not accepted by key or mutation
builders, and skipped options are unsuitable for suspense and prefetch-only hooks.
