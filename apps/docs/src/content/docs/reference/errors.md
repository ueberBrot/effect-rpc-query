---
title: Errors
description: Configuration, key-generation, and RPC execution errors.
---

## `EffectRpcQueryConfigError`

Thrown synchronously while configuring the utility tree or an option builder. Its `code` is one of:

- `InvalidMaxChunks`: a streamed-query bound is not a positive safe integer.
- `InvalidKeyPrefix`
- `InvalidRpcPath`
- `RpcPathCollision`
- `MissingKeyEncoder`
- `UnknownKeyEncoder`

It can also expose `rpcTag`, `path`, and an underlying `cause`.

## `EffectRpcQueryKeyError`

Thrown synchronously while preparing a payload-specific key. It exposes `rpcTag`, `cause`, and one
of these codes:

- `PayloadConstructionFailed`
- `PayloadEncodingFailed`
- `KeyEncoderFailed`
- `InvalidKeyValue`

## `EffectRpcQueryError<E>`

Thrown when the RPC runner returns a failed `Exit`. It exposes `rpcTag`, `operation`, and the full
`Cause.Cause<E>`. Use `isEffectRpcQueryError(value)` as the runtime guard within one JavaScript
realm; the guard uses `instanceof`. The operation is `query`, `infinite`, or `mutation`.

Streaming failures use the same class and preserve RPC, stream, middleware, client, defect, and
interruption Causes. Their operation is `streamed` or `live`.

A rejected runner promise passes through unchanged because no Effect `Cause` exists to preserve.

## `EffectRpcQueryEmptyStreamError`

Thrown when a live query's stream completes before emitting a value. It exposes the streaming RPC's
`rpcTag`. Accumulated streams return an empty array instead.
