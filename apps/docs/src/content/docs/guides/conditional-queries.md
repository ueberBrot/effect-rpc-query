---
title: Conditional Queries
description: Disable payload-bearing queries with the exact TanStack skip sentinel.
---

Use the exported `skipToken` when a payload-bearing query has no valid input yet:

```ts
import { skipToken } from 'effect-rpc-query'

const userOptions =
  userId === undefined
    ? rpcQuery.users.get.queryOptions(skipToken)
    : rpcQuery.users.get.queryOptions({ input: { id: userId } })

const user = useQuery(userOptions)
```

The export preserves the identity of Query Core’s sentinel. A skipped query uses the RPC’s query
operation prefix as its key and contains no unconstructed payload.

The sentinel applies only to payload-bearing `queryOptions`. Payloadless queries can run without
input, and key and mutation builders do not accept `skipToken`. TanStack suspense and prefetch-only
hooks also reject skipped options at the type level.
