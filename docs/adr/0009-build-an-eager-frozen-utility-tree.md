# Build an eager frozen utility tree

Status: Accepted. Implementation ownership clarified by [ADR 0021](0021-share-utility-construction-through-private-modules.md).

## Context

A Proxy or generated source would make the utility tree harder to inspect and introduce runtime or
build-time traps.

## Decision

The factory enumerates the RPC group's request map and eagerly builds an ordinary frozen object. It
validates the prefix, paths, collisions, and key-encoder configuration atomically before returning
the tree.

## Consequences

Prefixes, keys, and canonical payloads are frozen. Generated option objects remain fresh and
unfrozen, and caller-owned option values remain untouched.
