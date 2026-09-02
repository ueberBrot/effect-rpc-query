---
title: Queries and Mutations
description: Choose the generated operation that matches your RPC use.
---

Every unary RPC leaf exposes both query and mutation builders. The RPC definition does not decide
how the application uses the operation.

Use a query when TanStack should cache a result by semantic request identity. Payload-bearing query
keys contain the normalized, canonical payload, and TanStack can refetch or cancel the query.

Use a mutation when the call represents an action or write. Mutation variables arrive when the
mutation runs, and their values do not become part of the mutation key.

```ts
const user = useQuery(rpcQuery.users.get.queryOptions({ input: { id: 1 } }))

const removeUser = useMutation(rpcQuery.users.delete.mutationOptions())
removeUser.mutate({ id: 1 })
```

After a successful mutation, invalidate the affected query prefix explicitly. The package does not
infer relationships between RPCs.
