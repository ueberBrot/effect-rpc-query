---
title: Custom Key Encoders
description: Supply safe semantic identity for serviceful or redacted payloads.
---

By default, the factory constructs the RPC payload and synchronously encodes it with its Schema.
Supply a custom encoder when encoding requires Effect services or the payload contains
`Schema.Redacted` values.

```ts
const rpcQuery = createRpcQueryUtils(rpcGroup, {
  client,
  keyPrefix: ['admin'] as const,
  keyEncoders: {
    'secrets.read': (payload) => ({ secretId: identifySecret(payload.secret) }),
  },
  runPromiseExit,
})
```

An encoder receives the normalized payload and must return a strict `JsonValue` synchronously. It
must not reveal secrets. Return a stable public identifier, digest, or other safe semantic identity.

The encoder map is keyed by literal unary RPC tags. TypeScript requires entries for unsafe payloads;
the factory also rejects missing or unknown entries at runtime.

Choose an encoder carefully: inputs that can produce different RPC results must not collapse to the
same key.
