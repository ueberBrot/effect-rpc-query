---
title: Compatibility and Limits
description: Supported runtimes, frameworks, RPC shapes, and stability boundaries.
---

## Supported integration boundary

- Effect `4.0.0-rc.112` is the currently tested version.
- TanStack Query Core `>=5.102.0 <6` is the supported peer range.
- Query Core, React Query, React Router loaders, and TanStack Start are covered by repository tests
  or executable applications.
- Strict TypeScript 5.9 is the compiler floor. Packed consumers are verified with TypeScript 5.9
  and 7.
- The package is ESM-only and targets ES2022.

## Limits

- Only unary RPCs appear in the utility tree. Streaming RPCs are omitted.
- The package has no infinite-query builder or page-parameter contract.
- Leaves expose option and key builders, not a direct RPC execution helper.
- The caller owns RPC client acquisition, `Scope`, transport, Query Client, providers, router, SSR,
  hydration, and disposal.
- The package provides no framework adapter, provider, or Node-specific integration helper.
- Query cancellation reaches the runner as an `AbortSignal`; transport-level interruption depends on
  the client integration.
- Mutation cancellation is outside the generated API.
- Mutations do not invalidate queries automatically. Applications choose the affected key prefix.
- Query successes that may be `undefined` become `null` because TanStack Query rejects `undefined`
  query data. Mutation results keep their RPC success type.
- Cache identity must be strict JSON. Serviceful or redacted payloads need safe custom encoders.
- Key encoders are synchronous; asynchronous and Effect-returning encoders are unsupported.
- Payload Schemas must be query-stable because key preparation and ready-client execution construct
  the payload separately.
- The package does not serialize errors for SSR. The executable TanStack Start application omits
  failed queries from dehydration and refetches them in the browser.
- `isEffectRpcQueryError` uses `instanceof` and recognizes errors from the same JavaScript realm.
- CommonJS consumers are unsupported.

The package is under active development before its first stable release. Review release notes before
upgrading between minor versions.
