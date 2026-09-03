# Add infinite-query builders for unary RPCs

Every unary RPC leaf also exposes `infiniteKey` and `infiniteOptions`. `infiniteOptions` maps each
TanStack `pageParam` to payload constructor input, uses the mapped `initialPageParam` payload for the
canonical key, and runs every page through the existing Effect runner and cancellation signal. A
payload-bearing infinite query accepts `skipToken` only as its exact `input` value; payloadless RPCs
omit the mapper. Infinite keys use the `infinite` operation discriminator, and failed pages record
the `infinite` operation while preserving the complete Effect `Cause`.

This decision extends ADR 0002 and supersedes its two-builder boundary. It also supersedes the
exhaustive builder-name clause in ADR 0003, the query-only option and key clauses in ADRs 0004 and
0008, and the query-or-mutation discriminator clause in ADR 0005. The payload-stability requirement
from ADR 0014 applies to the mapped initial page and every later page.
