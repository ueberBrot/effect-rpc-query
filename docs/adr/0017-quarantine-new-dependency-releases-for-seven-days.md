# Quarantine new dependency releases for seven days

pnpm enforces a strict seven-day minimum release age, frozen lockfiles in CI, and explicit lifecycle-script permissions, favoring supply-chain observation over immediate upgrades. A fresh Effect release candidate or other intentionally evaluated tool may receive one reviewed exact-version exception after its release, provenance, scripts, and lockfile changes have been checked; package-wide exemptions remain forbidden, and each exception expires with the quarantine.
