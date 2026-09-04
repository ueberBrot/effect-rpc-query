# Normalize undefined query success to null

Status: Accepted.

## Context

TanStack Query rejects a successful `undefined` result. Effect RPC commonly uses `Schema.Void` and
runtime `undefined` for success.

## Decision

Generated query functions map successful `undefined` to cacheable `null`. Their query-data type also
replaces `undefined` with `null`. Mutations preserve `undefined`.

## Consequences

Every unary RPC remains usable as a query without disguising an upstream failure. This is the
adapter's only success-value normalization.
