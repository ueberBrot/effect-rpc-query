# Share utility construction through private modules

Status: Accepted. Clarifies ADR 0003, ADR 0005–0007, and ADR 0009. Extended by [ADR 0022](0022-add-buffered-http-utilities-with-separate-key-roots.md).

Core and protocol adapters stay private in one root package, with one public export and one
artifact. The utility-tree module accepts operation descriptions and owns atomic validation,
canonical keys, options, skipping, and unary Effect execution. Shared Query Core types contain
no RPC declarations.

The RPC module owns dotted tags, Schema inspection, payload construction and encoding, ready-client
invocation, request options, mapped types, and error construction. Request preparation binds the
execution input and canonical key together. Later RPC pages retain constructor-only preparation
because they reuse the initial page's cache identity. The stream module owns policy and cleanup.

This seam concentrates cache behavior while keeping protocol knowledge local. Existing public
factories remain the test surface; keys, errors, and application-owned resource lifetimes retain
their contracts. Public adapter registration and internal subpath exports remain excluded.
