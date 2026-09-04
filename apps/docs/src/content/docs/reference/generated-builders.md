---
title: Generated Builders
description: Branch and RPC leaf methods for keys, queries, mutations, and streams.
---

Every branch and leaf exposes `key()`, which returns its immutable cache-key prefix.

Each unary RPC leaf also exposes:

| Builder                     | Result                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `queryKey(input?)`          | Payload-specific, data-tagged query key. Payload-bearing RPCs require constructor input.                   |
| `queryOptions(options?)`    | Fresh Query Core options with owned `queryFn`, `queryKey`, and `queryKeyHashFn`.                           |
| `infiniteKey(input?)`       | Data-tagged infinite-query key derived from the initial page's payload.                                    |
| `infiniteOptions(options)`  | Fresh infinite-query options that map each `pageParam` to an RPC payload.                                  |
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

## Build an infinite query

Map each page parameter to the unary RPC payload. The initial mapped payload also determines the
semantic cache key.

```ts
const userPages = useInfiniteQuery(
  rpcQuery.users.page.infiniteOptions({
    initialPageParam: 0,
    input: (cursor) => ({ cursor, pageSize: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  }),
)

const initialKey = rpcQuery.users.page.infiniteKey({ cursor: 0, pageSize: 20 })
```

Payloadless RPCs omit `input`. To disable a payload-bearing infinite query, set its `input` field to
the exact sentinel:

```ts
const options = rpcQuery.users.page.infiniteOptions({
  initialPageParam: 0,
  input: skipToken,
  getNextPageParam: () => undefined,
})
```

The builder forwards applicable Query Core options but owns `queryFn`, `queryKey`, and
`queryKeyHashFn`. Each page runs through the same Effect runner and cancellation signal as an
ordinary query.

## Stream values

Each streaming RPC leaf exposes:

| Builder                     | Result                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `streamedKey(input?)`       | Data-tagged key for the accumulated sequence.                               |
| `streamedOptions(options?)` | Fresh Query Core options that append each emitted value to an array.        |
| `liveKey(input?)`           | Data-tagged key for the latest value.                                       |
| `liveOptions(options?)`     | Fresh Query Core options that replace the cached value after each emission. |

Both option builders publish the query as successful after its first value and keep
`fetchStatus: 'fetching'` until the stream ends. An empty accumulated stream resolves to `[]`; an
empty live stream fails with `EffectRpcQueryEmptyStreamError`.

Accumulated streams accept TanStack's `refetchMode` option:

- `reset` clears cached values and returns the query to pending before refetching. This is the
  default.
- `append` adds the new stream's values to the cached sequence.
- `replace` retains the old sequence until the new stream ends, then replaces it atomically.

Live queries always replace the cached value and therefore expose no `refetchMode`. Cancelling,
unmounting, or superseding either stream closes its iterator and interrupts its Effect resources.
