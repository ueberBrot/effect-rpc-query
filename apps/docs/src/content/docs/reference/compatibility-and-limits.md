---
title: Compatibility and Limits
description: Supported runtimes, frameworks, RPC shapes, and stability boundaries.
---

## Supported integration boundary

The first npm release targets `0.1.0`; until then, the repository manifest remains at `0.0.0`.

- Effect `4.0.0-rc.112` is the currently tested version.
- TanStack Query Core `>=5.102.0 <5.103.0` is the supported peer range. Packed consumers verify
  `5.102.0` as the lower bound and `5.102.8` as the development version.
- Query Core, React Query, React Router loaders, and TanStack Start are covered by repository tests
  or executable applications.
- Strict TypeScript 5.9 is the compiler floor. The packed package contract is verified with
  TypeScript 5.9 and 7. The TanStack Start fixture uses the same strict settings but skips checking
  its dependencies' declaration files.
- The package is ESM-only and targets ES2022.

## Limits

- Unary RPCs expose ordinary query, infinite-query, and mutation builders. Streaming RPCs expose
  accumulated-stream and live-query builders.
- Infinite queries map each TanStack `pageParam` to one unary RPC payload. Streaming builders adapt
  an Effect RPC stream through TanStack's experimental `streamedQuery` helper.
- Leaves expose option and key builders, not a direct RPC execution helper.
- The caller owns RPC client acquisition, `Scope`, transport, Query Client, providers, router, SSR,
  hydration, and disposal.
- The package provides no framework adapter, provider, or Node-specific integration helper.
- Query cancellation reaches the runner as an `AbortSignal`; stream cancellation closes the
  AsyncIterator. Transport-level interruption depends on the client integration.
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
- Completed stream data dehydrates normally. An open stream must be cancelled after its first
  successful server snapshot before route loading and dehydration can finish.
- `isEffectRpcQueryError` uses `instanceof` and recognizes errors from the same JavaScript realm.
- CommonJS consumers are unsupported.

## Expanding Query Core support

Query Core's streamed-query interface is experimental, so a new minor line must earn support. To
expand the peer range:

1. Update the Query Core and React Query development catalog entries together and regenerate the
   lockfile.
2. Widen the peer ceiling to include only the new verified minor line.
3. Run `vp run packed-package`. The task inspects the packed manifest, installs isolated consumers
   at the lower bound and development version, compiles the ordinary, infinite, accumulated-stream,
   and live builder contract with both supported TypeScript compilers, and executes every builder
   through the consumer's Query Core runtime.
4. Run the complete release validation before publishing.

Keep the existing range when either the declarations or runtime checks fail.

The package is under active development before its first stable release. Review release notes before
upgrading between minor versions.
