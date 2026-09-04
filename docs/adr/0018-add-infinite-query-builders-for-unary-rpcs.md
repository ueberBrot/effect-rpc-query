# Add infinite-query builders for unary RPCs

Status: Accepted. Supersedes parts of ADR 0002, ADR 0003, ADR 0004, ADR 0005, and ADR 0008.

## Context

Unary RPCs that load pages need generated cache identity and execution behavior consistent with
ordinary queries.

## Decision

Every unary RPC leaf also exposes `infiniteKey` and `infiniteOptions`. `infiniteOptions` maps each
TanStack `pageParam` to payload constructor input, uses the mapped `initialPageParam` payload for the
canonical key, and runs every page through the existing Effect runner and cancellation signal. A
payload-bearing infinite query accepts `skipToken` only as its exact `input` value; payloadless RPCs
omit the mapper. Infinite keys use the `infinite` operation discriminator, and failed pages record
the `infinite` operation while preserving the complete Effect `Cause`.

## Consequences

The payload-stability requirement from ADR 0014 applies to the mapped initial page and every later
page. This decision extends ADR 0002's two-builder boundary, ADR 0003's builder-name list, ADR 0004's
option set, ADR 0005's operation discriminator, and ADR 0008's key operations.
