# Host Effect RPC inside TanStack Start

Status: Accepted. Supersedes part of ADR 0013.

## Context

TanStack Start already provides the server route needed to host Effect RPC. Sending its requests to
the standalone example server would obscure the full-stack integration.

## Decision

The TanStack Start example hosts the standard Effect RPC HTTP protocol at its own exact `POST /rpc`
route. A host-neutral Web handler keeps the implementation shared. The standalone Node server
remains the Vite React hosting adapter.

## Consequences

The examples exercise different hosting adapters while sharing the RPC implementation. This
supersedes ADR 0013's requirement that both examples use the standalone server.
