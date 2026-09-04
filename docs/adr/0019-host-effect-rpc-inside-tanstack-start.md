# Host Effect RPC inside TanStack Start

The TanStack Start example hosts the standard Effect RPC HTTP protocol at its own exact `POST /rpc` server route, while the standalone Node server remains the hosting adapter for Vite React. A host-neutral Web handler keeps the RPC implementation shared across both hosts; this supersedes ADR 0013's choice that both examples use the standalone server because Start already provides the appropriate server route.
