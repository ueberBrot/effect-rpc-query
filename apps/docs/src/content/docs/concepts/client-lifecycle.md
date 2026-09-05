---
title: Client Lifecycle
description: Keep RPC Scope and application resources under caller ownership.
---

The factory accepts a ready flat RPC client. It does not acquire the client, open its `Scope`, or
dispose application resources.

This boundary keeps ownership explicit:

1. The application opens the RPC client’s `Scope` and builds any required runtime.
2. The application creates its `QueryClient` and RPC utility tree.
3. Generated ordinary, infinite, accumulated-stream, live, and mutation functions call the ready
   client through `runPromiseExit`.
4. Shutdown cancels active queries, clears the cache, and then closes the RPC client resources.

Use a separate application boundary per server request. In a browser, retain one boundary for the
application lifetime. This prevents request data and scoped services from leaking between owners.

The factory has no React, router, transport, provider, or server-rendering lifecycle of its own.

## Request-local configuration

Use a builder's `rpcOptions` for metadata or configuration specific to one request, such as a
request-source header or streaming buffer size. The `context` value is local to Effect RPC client
processing; it is not a serialized server Context and does not replace the supplied Effect runner.

Keep ordinary authentication, middleware, transport setup, runtime services, and Scope ownership
in the application-owned client and runtime. Both executable examples retain their authorization
header in the shared client runner and add `x-request-source: diagnostics-panel` only to the
failure diagnostic's generated mutation options.
