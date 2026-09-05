# Preserve the Cause in one error wrapper

Status: Amended by ADR 0018 and ADR 0020. Implementation ownership clarified by [ADR 0021](0021-share-utility-construction-through-private-modules.md). Extended by [ADR 0022](0022-add-buffered-http-utilities-with-separate-key-roots.md).

## Context

Flattening Effect failures would discard typed failure, defect, interruption, and parallel-cause
information.

## Decision

Only a failed RPC `Exit` becomes an `EffectRpcQueryError<E>`. It preserves the untouched Effect
`Cause<E>`, the literal RPC tag, and the operation. ADR 0018 adds infinite-query operations; ADR
0020 adds accumulated-stream and live-query operations.

Configuration and key-generation failures use `EffectRpcQueryConfigError` and
`EffectRpcQueryKeyError`. User callbacks, TanStack callbacks, and runner rejections that produce no
`Exit` remain untouched.

## Consequences

Public errors expose discriminants and relevant tag or path metadata without retaining raw input or
encoder output. Query preparation fails synchronously. Failures inside the RPC Effect remain in its
Cause.
