---
title: TanStack Start
description: Share generated query options across loaders, SSR, and React components.
---

## Host Effect RPC in Start

Create an exact server route and pass its Web `Request` to a long-lived Effect RPC handler:

```ts
export const Route = createFileRoute('/rpc')({
  server: {
    handlers: {
      POST: ({ request }) => handleRpcRequest(request),
    },
  },
})
```

Effect's request/response RPC transport sends every query and mutation to this POST endpoint. It
does not map queries to GET requests or encode procedure names in the URL. Build the handler once
for the Start server's lifetime so RPC state and acquired resources survive individual requests.

## Share utilities through the router context

Put the application-owned `QueryClient` and RPC utility tree in the router context. A route loader
can then fill the cache used by its component:

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
  return <pre>{JSON.stringify(users.data, null, 2)}</pre>
}
```

## Preserve application lifetimes

Create a fresh application boundary per page request. Dehydrate that request's Query Client, send
its state to the browser, and hydrate a browser-owned Query Client. Reusing the same generated
options preserves cache identity because the keys depend on the key prefix, RPC tag, operation, and
canonical payload.

`effect-rpc-query` does not create the router, providers, request context, or hydration boundary.
The executable [TanStack Start example](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/tanstack-start)
shows the complete integration, including handler cleanup for server-route requests and hot module
replacement.
