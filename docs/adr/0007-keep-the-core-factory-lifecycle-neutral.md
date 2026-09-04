# Keep the core factory lifecycle-neutral

Status: Accepted.

## Context

The application, not the query adapter, knows the correct protocol, middleware, runtime, and
browser-versus-server lifetime.

## Decision

The core factory accepts a ready flat Effect RPC client. It never constructs, scopes, or disposes
that client. Service-free calls default to `Effect.runPromiseExit`; residual Schema services require
an injected runner with the same `effect, { signal? }` shape.

## Consequences

The caller owns protocol, middleware, lifetime, and resources. Queries forward TanStack's abort
signal, mutations omit it, and runner rejections propagate untouched.
