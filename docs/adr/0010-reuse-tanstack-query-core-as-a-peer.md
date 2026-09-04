# Reuse TanStack Query Core as a peer

Status: Accepted.

## Context

Generated objects and declarations expose TanStack Query Core runtime values and types.

## Decision

`@tanstack/query-core` is an external peer. The package tests its declared v5 lower bound and the
current v5. It re-exports only primitives required by its own API, including the exact `skipToken`
and `SkipToken` bindings.

## Consequences

Consumers use the same bindings, or broader Query APIs, from their TanStack installation.
`skipToken` applies only to payload-bearing query options. React, React Query, and TanStack Start
remain outside the peer set until a public entry point imports them directly.
