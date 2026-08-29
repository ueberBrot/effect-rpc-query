# Keep the core factory lifecycle-neutral

The core factory accepts a ready flat Effect RPC client and never constructs, scopes, or disposes it. This leaves protocol, middleware, browser-versus-SSR lifetime, and resource ownership with the caller that acquired the client. Service-free calls default to `Effect.runPromiseExit`; residual Schema services require an injected runner with the same `effect, { signal? }` shape, through which queries forward TanStack's abort signal, mutations omit it, and runner rejections propagate untouched.
