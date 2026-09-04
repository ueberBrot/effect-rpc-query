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
