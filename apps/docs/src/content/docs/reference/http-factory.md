---
title: HTTP Factory
description: Buffered HTTP utility construction, request input, and ownership.
---

`createHttpApiQueryUtils(api, options)` derives an eager, frozen HTTP utility tree from an Effect
HttpApi and an application-owned ready HttpApiClient. Import it from `effect-api-query`.

Ordinary groups appear as `utils[groupIdentifier][endpointIdentifier]`. Top-level groups place
their endpoints at `utils[endpointIdentifier]`. Identifiers containing dots remain literal
properties. Every retained branch and endpoint has `key()`; buffered endpoints also have
`queryKey`, `queryOptions`, `mutationKey`, and `mutationOptions`.

## Factory options

| Option           | Contract                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `client`         | Ready client for the supplied HttpApi. The application owns its transport, middleware, and lifetime.                        |
| `keyPrefix`      | Non-empty JSON tuple containing any safe tenant, user, or other client-identity partition.                                  |
| `runPromiseExit` | Required when exposed endpoints or the ready client need execution services. Service-free calls default to Effect's runner. |
| `keyEncoders`    | Synchronous encoders keyed first by declaration group identifier, then endpoint identifier, including top-level groups.     |

A key encoder receives the complete decoded HTTP request input and returns `JsonValue`. Request
encoding services and explicit redacted values require an encoder. An encoder does not provide
execution services; the runner remains independently required.

## Request and result contract

HTTP input contains the endpoint's declared `params`, `query`, `headers`, and `payload` parts in
their decoded types. It does not apply RPC constructor defaults. Inputless queries need no input
argument. Mutations receive the same decoded request shape as their variables.

The adapter forces decoded-only responses. Queries cache a successful `undefined` as `null`;
mutations retain `undefined`. Buffered response-header wrappers retain their decoded shape.
The package does not add serialization for arbitrary decoded domain values.

Any streaming success alternative, including a header-wrapped stream, omits the complete endpoint.
Any multipart request alternative does the same. Groups containing only omitted endpoints disappear.
Factory construction rejects unsafe names, path collisions, and contradictory multipart metadata
before returning a tree. Preserve literal declaration types for corresponding inferred omission.

## Cache identity and failures

HTTP keys begin with `keyPrefix`, `http`, and the HttpApi identifier, followed by the projected
endpoint path and operation discriminator. Query keys append canonical request identity when the
endpoint has input. `utils.key()` includes the generated root and matches every HTTP descendant.
RPC utilities use a separate `rpc` discriminator. Use the original caller prefix deliberately
when invalidating across both adapters.

`EffectHttpApiQueryError` wraps a failed execution `Exit`, identifies the API, group, endpoint,
method, and operation, and preserves its complete Cause. The package adds no concrete request
values to that metadata; upstream Causes can still contain requests, responses, or Schema issue
values. `isEffectHttpApiQueryError` narrows execution errors. Configuration and key preparation
failures use `EffectHttpApiQueryConfigError` and `EffectHttpApiQueryKeyError` respectively.

The [packed HTTP consumer](https://github.com/ueberBrot/effect-rpc-query/blob/main/tests/packed-consumer/http-runtime.mts)
exercises the real HTTP encoding, routing, and decoding pipeline. The
[type contract](https://github.com/ueberBrot/effect-rpc-query/blob/main/tests/types/http-contract.ts)
checks request input, result inference, services, and endpoint omission.
