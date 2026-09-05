---
title: Compatibility and Stability
description: Check the supported package versions, module format, and pre-1.0 policy.
---

The current source is tested with the Effect `4.0.0-rc.112` release candidate. The published Query
Core peer range is `>=5.102.0 <6`. Packed consumers exercise `5.102.0` as the lower bound and
`5.102.8` as the development version.

The package uses Query Core's experimental streamed-query interface. Later compatible v5 releases
remain installable under the peer range; the lower-bound and development-version checks catch known
type and runtime incompatibilities before release.

Strict TypeScript 5.9 is the compiler floor. Packed consumers are checked with TypeScript 5.9 and 7.
The documentation package uses TypeScript 6 because Astro's checker does not yet support the
TypeScript 7 compiler API; this does not change the library's consumer range.

The package is ESM-only and targets ES2022. It is under active development before its first stable
release, so minor releases can change the API. Review release notes before upgrading.

Continue with the [quick start](/effect-rpc-query/getting-started/quick-start/), or review the full
[compatibility and limits reference](/effect-rpc-query/reference/compatibility-and-limits/).
