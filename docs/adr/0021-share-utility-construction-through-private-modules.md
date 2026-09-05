# Share utility construction through private modules

Status: Accepted. Clarifies the implementation ownership in ADR 0003, ADR 0005–0007, and ADR 0009.

The [expanded package specification](https://github.com/ueberBrot/effect-rpc-query/issues/1)
calls for RPC and HTTP adapters in one root package, with one public export and one artifact.
[Issue 61](https://github.com/ueberBrot/effect-rpc-query/issues/61) establishes the private seam
using the existing RPC behavior. Package renaming and HTTP support follow in separate tickets.

The utility-tree module accepts operation descriptions and returns the complete frozen tree. It
owns atomic path and encoder validation, canonical JSON, keys, option construction, skipping,
and unary Effect execution. Its shared types express Query Core options and initial-data
guarantees without importing RPC declarations. This concentrates cache behavior behind one
interface while keeping protocol-specific knowledge local to each adapter.

The RPC module owns dotted-tag projection, Schema inspection, payload construction and encoding,
flat-client invocation, request options, and RPC mapped types. Each input-bearing operation
prepares its execution input and key material together; the utility-tree module canonicalizes
that material and binds the resulting key and input in one private preparation step. Later RPC
pages retain their existing constructor-only preparation because they reuse the initial page's
cache identity. Mutations retain the ready client's construction and failure semantics.

The existing stream module remains in the RPC implementation. It owns stream policy, failure
wrapping, iterator cleanup, and empty-live-stream behavior. Small private error capabilities let
the utility-tree module preserve the public RPC error classes, codes, and metadata without
importing them. The operation interface contains only capabilities exercised by the RPC adapter;
HTTP tickets will extend it when their concrete requirements demand it.

The package exposes its factories and public types through the root export. Core and adapter
modules stay private; there is no public adapter registration or internal subpath export.
Existing public-factory, QueryClient, packed-consumer, and application tests remain the test
surface. RPC keys, constructor inputs, request options, and resource ownership are unchanged.
