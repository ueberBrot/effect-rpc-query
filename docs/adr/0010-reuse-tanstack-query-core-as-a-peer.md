# Reuse TanStack Query Core as a peer

Status: Accepted.

## Context

Generated objects and declarations expose TanStack Query Core runtime values and types.

## Decision

`@tanstack/query-core` is an external peer. The package tests its declared lower bound and its
development version within one verified minor line. Because the package imports Query Core's
experimental streamed-query interface, the peer range stops before the next minor line. A later
minor line becomes supported only after packed consumers verify its declarations and runtime
behavior. The package re-exports only primitives required by its own interface, including the exact
`skipToken` and `SkipToken` bindings.

## Consequences

Consumers use the same bindings, or broader Query APIs, from their TanStack installation.
`skipToken` applies only to payload-bearing query options. React, React Query, and TanStack Start
remain outside the peer set until a public entry point imports them directly.
