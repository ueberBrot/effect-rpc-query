---
title: Feature Support
description: Check which capabilities the package generates, tests, leaves to the application, or does not support.
---

`effect-rpc-query` turns unary Effect RPC definitions into semantic keys and TanStack Query Core
options. Applications continue to configure TanStack Query and manage the RPC client.

Use these status values to read the matrix:

- **Generated**: the package creates the key, function, or option object.
- **Tested**: repository fixtures or executable applications verify that generated output works
  with the listed native TanStack API.
- **Application-owned**: use the upstream Effect, TanStack, or framework API directly.
- **Not supported**: the package exposes no contract for this capability.

## Capability matrix

| Capability                                                                                 | Status            | Boundary                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unary RPC queries                                                                          | Generated         | Each unary leaf builds `queryOptions` and semantic `queryKey` values with inferred input, data, and failure types.                                                     |
| Infinite queries                                                                           | Generated         | Each unary leaf builds `infiniteOptions` and `infiniteKey` values with inferred page parameters, payloads, data, selected data, and failures.                          |
| Unary RPC mutations                                                                        | Generated         | Each unary leaf builds `mutationOptions` and a stable `mutationKey`; variables remain inferred at execution.                                                           |
| Hierarchical cache keys                                                                    | Generated         | Root, branch, RPC, query, infinite-query, and mutation keys support TanStack's native array-prefix matching.                                                           |
| Conditional queries                                                                        | Generated         | Payload-bearing queries accept TanStack's exact `skipToken` value.                                                                                                     |
| Page-number and cursor queries                                                             | Generated         | Put the page or cursor in an ordinary unary RPC payload; it becomes part of the semantic query key.                                                                    |
| Query cancellation                                                                         | Generated         | Query and infinite-query functions forward TanStack's `AbortSignal` to the Effect runner. The client transport must honor interruption.                                |
| Query policies and transformations                                                         | Tested            | Applicable Query Core options pass through, including `select`, `initialData`, retry, freshness, garbage collection, refetch controls, network mode, and metadata.     |
| Mutation callbacks                                                                         | Tested            | Applicable mutation options pass through. Build native optimistic updates with `onMutate`, `onError`, `onSuccess`, or `onSettled` and the application's `QueryClient`. |
| Cache reads, writes, prefetching, invalidation, and refetching                             | Tested            | Pass generated options or keys to the native `QueryClient` methods.                                                                                                    |
| React Query                                                                                | Tested            | Generated options work with ordinary, infinite, suspense, prefetch, and mutation hooks.                                                                                |
| TanStack Router and Start                                                                  | Tested            | Generated ordinary and infinite options work in loaders, server rendering, successful-query hydration, and client navigation.                                          |
| RPC transport and client lifecycle                                                         | Application-owned | Supply a ready flat RPC client and keep its `Scope` alive. The examples use HTTP; the package does not construct a transport.                                          |
| Providers, Devtools, persistence, broadcast, and offline policy                            | Application-owned | Configure these through TanStack Query. The package provides no wrapper or default policy for them.                                                                    |
| Framework packages and non-React integration                                               | Application-owned | Use the native framework package and evaluate the integration in the application. This repository tests React Query only.                                              |
| Query-versus-mutation classification                                                       | Application-owned | Every unary leaf offers both builders because Effect RPC definitions do not label reads and writes.                                                                    |
| Automatic invalidation                                                                     | Not supported     | Mutations do not choose affected queries. Invalidate with generated prefix keys in application callbacks.                                                              |
| Streaming RPCs and subscriptions                                                           | Not supported     | Streaming leaves are omitted from the inferred and runtime utility trees. There is no subscription, live-query, buffering, or stream-cache API.                        |
| TanStack [`streamedQuery`](https://tanstack.com/query/latest/docs/reference/streamedQuery) | Not supported     | TanStack's experimental AsyncIterable helper does not adapt an Effect RPC stream through this package.                                                                 |
| Mutation cancellation                                                                      | Not supported     | TanStack mutation functions provide no query-style abort signal, and the package invents no cancellation context.                                                      |
| Direct RPC execution helpers                                                               | Not supported     | Leaves expose keys and TanStack option builders, with no `.call` or `.effect` method.                                                                                  |
| SSR error and Effect Cause serialization                                                   | Not supported     | Failed queries are omitted from dehydration and refetched in the browser; the package defines no cross-realm error format.                                             |
| Asynchronous or Effect-returning key encoders                                              | Not supported     | Key identity is derived synchronously before TanStack receives the query options.                                                                                      |

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
