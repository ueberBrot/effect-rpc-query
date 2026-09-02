---
title: Feature Support
description: See which Effect RPC and TanStack Query capabilities are generated, native, application-owned, or unsupported.
---

`effect-rpc-query` covers a deliberate integration boundary. It turns unary Effect RPC definitions
into semantic keys and ordinary TanStack Query Core options. TanStack Query and the application keep
their existing orchestration responsibilities.

The table uses four status values:

- **Generated**: the package creates the key, function, or option object.
- **Certified**: repository fixtures or executable applications verify the native TanStack API.
- **Application-owned**: use the upstream Effect or TanStack API directly.
- **Not supported**: the package exposes no contract for this capability.

## Capability matrix

| Capability                                                                                          | Status            | Boundary                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unary RPC queries                                                                                   | Generated         | Each unary leaf builds `queryOptions` and semantic `queryKey` values with inferred input, data, and failure types.                                                 |
| Unary RPC mutations                                                                                 | Generated         | Each unary leaf builds `mutationOptions` and a stable `mutationKey`; variables remain inferred at execution.                                                       |
| Hierarchical cache keys                                                                             | Generated         | Root, branch, RPC, query, and mutation keys support TanStack's native array-prefix matching.                                                                       |
| Conditional queries                                                                                 | Generated         | Payload-bearing queries accept TanStack's exact `skipToken` value.                                                                                                 |
| Page-number and cursor queries                                                                      | Generated         | Put the page or cursor in an ordinary unary RPC payload; it becomes part of the semantic query key.                                                                |
| Query cancellation                                                                                  | Generated         | The query function forwards TanStack's `AbortSignal` to the Effect runner. The client transport must honor interruption.                                           |
| Query policies and transformations                                                                  | Certified         | Applicable Query Core options pass through, including `select`, `initialData`, retry, freshness, garbage collection, refetch controls, network mode, and metadata. |
| Mutation callbacks and optimistic updates                                                           | Certified         | Applicable mutation options pass through. Use `onMutate`, `onError`, `onSuccess`, or `onSettled` with the application's `QueryClient`.                             |
| Cache reads, writes, prefetching, invalidation, and refetching                                      | Certified         | Pass generated options or keys to the native `QueryClient` methods.                                                                                                |
| React Query                                                                                         | Certified         | Generated options work with ordinary query, suspense, prefetch, and mutation hooks.                                                                                |
| TanStack Router and Start                                                                           | Certified         | Generated options work in loaders, server rendering, successful-query hydration, and client navigation.                                                            |
| RPC transport and client lifecycle                                                                  | Application-owned | Supply a ready flat RPC client and keep its `Scope` alive. The examples use HTTP; the package does not construct a transport.                                      |
| Providers, Devtools, persistence, broadcast, and offline policy                                     | Application-owned | Configure these through TanStack Query. The package provides no wrapper or default policy for them.                                                                |
| Query-versus-mutation classification                                                                | Application-owned | Every unary leaf offers both builders because Effect RPC definitions do not label reads and writes.                                                                |
| Automatic invalidation                                                                              | Not supported     | Mutations do not choose affected queries. Invalidate with generated prefix keys in application callbacks.                                                          |
| Streaming RPCs and subscriptions                                                                    | Not supported     | Streaming leaves are omitted from the inferred and runtime utility trees. There is no subscription, live-query, buffering, or stream-cache API.                    |
| TanStack [`streamedQuery`](https://tanstack.com/query/latest/docs/reference/streamedQuery)          | Not supported     | TanStack's experimental AsyncIterable helper does not adapt an Effect RPC stream through this package.                                                             |
| [Infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries/) | Not supported     | There is no `infiniteQueryOptions` builder or contract that maps TanStack's `pageParam` into an RPC payload.                                                       |
| Mutation cancellation                                                                               | Not supported     | TanStack mutation functions provide no query-style abort signal, and the package invents no cancellation context.                                                  |
| Direct RPC execution helpers                                                                        | Not supported     | Leaves expose keys and TanStack option builders, with no `.call` or `.effect` method.                                                                              |
| SSR error and Effect Cause serialization                                                            | Not supported     | Failed queries are omitted from dehydration and refetched in the browser; the package defines no cross-realm error format.                                         |
| Framework-specific adapters and non-React certification                                             | Not supported     | The package ships no hooks, provider, Router adapter, Start adapter, or certified Vue, Solid, or Svelte integration.                                               |
| Asynchronous or Effect-returning key encoders                                                       | Not supported     | Key identity is derived synchronously before TanStack receives the query options.                                                                                  |

Read [Compatibility and Limits](/effect-rpc-query/reference/compatibility-and-limits/) for version,
module-format, payload, key-safety, and error-boundary details.

## Design influences

The API design draws on these projects:

- [tRPC's TanStack React Query integration](https://github.com/trpc/trpc/tree/main/packages/tanstack-react-query)
  derives TanStack-native option builders from a typed RPC surface.
- [Effect Query](https://github.com/voidhashcom/effect-query) runs Effect programs through TanStack
  Query and demonstrates Effect RPC integration.

This package builds directly on [Effect](https://github.com/Effect-TS/effect) RPC definitions and
[TanStack Query](https://github.com/TanStack/query). Its focused contract adds an eager RPC utility
tree, Schema-derived semantic keys, caller-owned RPC clients, and complete Effect Cause preservation.
