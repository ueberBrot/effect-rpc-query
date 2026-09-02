---
title: React Query
description: Use generated options with React Query hooks.
---

Create the RPC utility tree beside the application’s `QueryClient`, then provide both through your
application context. Generated options pass directly to React Query hooks.

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const Users = ({ rpcQuery }: { rpcQuery: AppRpcQuery }) => {
  const queryClient = useQueryClient()
  const users = useQuery(rpcQuery.users.list.queryOptions())
  const removeUser = useMutation(
    rpcQuery.users.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: rpcQuery.users.key() }),
    }),
  )

  // Render users.data and call removeUser.mutate({ id }).
}
```

Payload-bearing queries take constructor input inside the options argument:

```ts
useQuery(rpcQuery.users.get.queryOptions({ input: { id: 1 } }))
```

Mutation input arrives later as mutation variables:

```ts
const createUser = useMutation(rpcQuery.users.create.mutationOptions())
createUser.mutate({ name: 'Ada' })
```

The package owns each generated `queryFn`, `queryKey`, `queryKeyHashFn`, `mutationFn`, and
`mutationKey`. Other Query options, including `select`, `retry`, and lifecycle callbacks, retain
their normal TanStack types.
