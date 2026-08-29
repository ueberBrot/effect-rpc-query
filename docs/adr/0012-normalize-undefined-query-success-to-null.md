# Normalize undefined query success to null

TanStack Query rejects a successful query result of `undefined`, while Effect RPC commonly uses `Schema.Void` and runtime `undefined` for success. Generated query functions therefore map successful `undefined` to cacheable `null`, and their query-data type replaces `undefined` with `null`; mutations preserve `undefined`. This is the adapter's only success-value normalization and keeps every unary RPC usable as a query without disguising an upstream failure.
