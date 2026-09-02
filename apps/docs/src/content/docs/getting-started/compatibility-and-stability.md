---
title: Compatibility and Stability
description: Check the supported package versions, module format, and pre-1.0 policy.
---

The current source is tested with the Effect `4.0.0-rc.111` release candidate and TanStack Query
`5.102.x`. The published Query Core peer range is `>=5.102.0 <6`.

Strict TypeScript 5.9 is the compiler floor. Packed consumers are checked with TypeScript 5.9 and 7.
The documentation package uses TypeScript 6 because Astro's checker does not yet support the
TypeScript 7 compiler API; this does not change the library's consumer range.

The package is ESM-only and targets ES2022. It is under active development before its first stable
release, so minor releases can change the API. Review release notes before upgrading.

Continue with the [quick start](/effect-rpc-query/getting-started/quick-start/), or review the full
[compatibility and limits reference](/effect-rpc-query/reference/compatibility-and-limits/).
