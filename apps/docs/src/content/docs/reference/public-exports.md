---
title: Public Exports
description: Curated reference for the package root exports.
---

All supported imports come from `effect-rpc-query`.

| Export                           | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `createRpcQueryUtils`            | Build the RPC utility tree.                                        |
| `skipToken`                      | Query Core’s exact sentinel for disabling payload-bearing queries. |
| `EffectRpcQueryConfigError`      | Invalid factory configuration.                                     |
| `EffectRpcQueryKeyError`         | Payload or key preparation failure.                                |
| `EffectRpcQueryError`            | Failed RPC `Exit` with its Effect `Cause`.                         |
| `EffectRpcQueryEmptyStreamError` | Live stream completed without a value.                             |
| `isEffectRpcQueryError`          | Runtime guard for RPC execution errors.                            |
| `CreateRpcQueryUtilsOptions`     | Factory option type.                                               |
| `RpcQueryUtils`                  | Generated utility-tree type.                                       |
| `RunPromiseExit`                 | Runner adapter type with optional abort signal.                    |
| `KeyEncoder`                     | Synchronous semantic key-encoder type.                             |
| `JsonValue`                      | Immutable strict-JSON key value.                                   |
| `QueryData`                      | Query success type with possible `undefined` normalized to `null`. |
| `SkipToken`                      | Type of the exported skip sentinel.                                |
| `EffectRpcQueryConfigErrorCode`  | Stable configuration error-code union.                             |
| `EffectRpcQueryKeyErrorCode`     | Stable key error-code union.                                       |

The package does not generate TypeDoc output. This page documents the small public surface directly
and links each export to its role in the integration.
