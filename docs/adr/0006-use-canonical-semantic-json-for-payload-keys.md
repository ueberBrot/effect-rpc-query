# Use canonical semantic JSON for payload keys

Status: Accepted.

## Context

Raw constructor input and transport bytes do not provide stable semantic cache identity.

## Decision

Query keys use a synchronous JSON representation of the normalized payload. The default path
constructs the payload, Schema-encodes it, and copies it into a deeply frozen canonical form with
sorted object keys and normalized numbers. A typed, tag-keyed encoder may replace Schema encoding.

## Consequences

Schemas that require encoding services or contain an explicit `Schema.Redacted` require a custom
encoder. Callers remain responsible for other sensitive fields. Values outside strict JSON,
including sparse arrays, cycles, and non-plain objects, are rejected. Schema inspection expands
suspended nodes and terminates on recursive references.

Key objects also reject `__proto__` and `constructor` properties at every depth. TanStack's default
hashing cannot safely process these properties. The restriction applies to prefixes and encoder
output so generated options and key-only cache operations agree on identity.
