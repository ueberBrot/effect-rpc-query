---
'effect-rpc-query': minor
---

Reject `__proto__` and `constructor` properties in cache keys so generated options and TanStack's
key-only operations agree on identity. Ignore inherited key encoders and require safe encoders for
suspended schemas containing redacted values or encoding middleware. Support recursive payload
types when checking whether a key encoder is required.
