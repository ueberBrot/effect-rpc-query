---
title: TanStack Start
description: Share generated query options across loaders, SSR, and React components.
---

Put the application-owned `QueryClient` and RPC utility tree in the router context. A route loader
can then fill the same cache used by its component:

```tsx
export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.rpcQuery.users.list.queryOptions())
  },
  component: UsersRoute,
})

function UsersRoute() {
  const { rpcQuery } = Route.useRouteContext()
  const users = useSuspenseQuery(rpcQuery.users.list.queryOptions())
  return <UserList users={users.data} />
}
```

Create a fresh application boundary per server request. Dehydrate that request’s Query Client,
send its state to the browser, and hydrate a browser-owned Query Client. Reusing the same generated
options preserves cache identity because the keys depend on the key prefix, RPC tag, operation, and
canonical payload.

`effect-rpc-query` does not create the router, providers, request context, or hydration boundary.
The executable [TanStack Start example](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/tanstack-start)
shows the complete integration.
