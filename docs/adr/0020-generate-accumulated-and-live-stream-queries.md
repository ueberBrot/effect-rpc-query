# Generate accumulated and live stream queries

Status: Accepted. Supersedes parts of ADR 0002 and ADR 0003.

## Context

Streaming RPCs need query semantics that distinguish a collected history from the latest emitted
value.

## Decision

Every streaming RPC leaf exposes `streamedKey`, `streamedOptions`, `liveKey`, and `liveOptions`.
Accumulated streamed queries cache emitted values in order and support TanStack's `reset`, `append`,
and `replace` refetch modes. Live queries replace the cached value after each emission and fail with
`EffectRpcQueryEmptyStreamError` when the stream completes without a value. Distinct `streamed` and
`live` key segments prevent collisions with ordinary, infinite, and mutation entries.

The ready RPC client remains the execution seam. Generated stream functions use TanStack's abort
signal, close their AsyncIterator on cancellation, and preserve the complete Effect `Cause`. The
application continues to own the ready client, runtime, transport, middleware, `Scope`, Query Client,
and framework lifecycle. Server rendering may dehydrate completed data normally; an open stream
requires the application to cancel it after the first successful server snapshot.

## Consequences

- Applications call the ready RPC client directly when they need execution without TanStack.
- Effect middleware and client construction remain the interception seams.
- Applications express invalidation policy with generated prefix keys.
- Mutation cancellation remains unavailable because TanStack provides no mutation abort signal.
