# Add buffered HTTP utilities with separate key roots

Status: Accepted. Amends ADR 0001, ADR 0003, ADR 0005–0008, and ADR 0021.

The root package exposes `createHttpApiQueryUtils` beside `createRpcQueryUtils`. Both adapters use
the private utility-tree module for validation, keys, TanStack options, and failed-Exit handling.
HTTP extraction and RPC extraction remain separate because their request and projection contracts differ.

HTTP group and endpoint identifiers are literal property names, including dots. Ordinary groups
nest endpoints; top-level groups project them at the root. Unsafe names and projected collisions
fail before a tree escapes. An endpoint with any streaming success alternative, including a
header-wrapped stream, or any multipart request alternative is omitted completely. Groups with no
supported endpoints disappear. Contradictory multipart encoding and brand metadata fail atomically.
This bounded surface avoids promising a buffered result for an operation that can stream.

HTTP builders accept decoded request parts and force `decoded-only` client execution. They preserve
the ready client's schema, middleware, transport, and additional error channels. Request-encoding
and response/error-decoding services require a caller-supplied runner. The caller owns client
acquisition, middleware, transport, Scope, and disposal; a custom key encoder supplies no execution
services. Ordinary query `undefined` becomes `null`, and mutation data remains unchanged.

HTTP failures use the `EffectHttpApiQueryError`, `EffectHttpApiQueryConfigError`, and
`EffectHttpApiQueryKeyError` families. Only a failed execution `Exit` becomes an HTTP execution
error. Its metadata contains declaration identifiers, and its untouched Cause can retain upstream
request, response, and Schema issue values. Runner rejections remain unchanged.

Both factories append an adapter discriminator after the caller's key prefix. RPC appends `rpc`
and then dotted tag segments. HTTP appends `http`, the API identifier, and the projected endpoint
path. The operation discriminator and canonical query input follow. Each factory's `key()` returns
its generated root, preserving native prefix invalidation while separating protocols. Applications
may use the original caller prefix for deliberate cross-adapter invalidation and must include safe
client-identity partitions where results vary by tenant, user, or middleware.

The [HTTP technical-spine proof](../research/http-technical-spine.md) records the pinned upstream
assumptions and executable evidence. Semantic HTTP key coverage, further execution guarantees,
and conditional/infinite builders continue in issues #64–#66.
