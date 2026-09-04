# Centralize the toolchain in Vite+

Status: Accepted.

## Context

Parallel configuration stacks would let formatting, linting, type checking, tests, and packaging
drift apart.

## Decision

Centralize those tasks in Vite+'s `vite.config.ts` and integrated tools. Keep separate tools only for
capabilities Vite+ does not own, such as Astro diagnostics, Effect-aware test helpers, full-process
browser tests, packed-package checks, and release management.

## Consequences

Library development uses TypeScript 7 with matching Effect diagnostics. Packed declarations are
also checked with TypeScript 5.9. The private documentation package may use a compatible compiler
when Astro does not support the repository compiler API. Strict package and dependency checks remain
release gates; dependency-update automation remains deferred.
