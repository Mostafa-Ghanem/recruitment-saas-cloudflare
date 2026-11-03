# HireFlow ATS — implementation status (2026-11-02)

**Branch:** `develop/recruitment-saas` — **Draft PR #1**. Full SaaS app is **NOT** deployed or ready for production PII.

## What is actually implemented in source

- Better Auth workspace-gated recruiter overview for company owner/admin at `/workspaces/{workspaceSlug}/recruitment`.
- D1 jobs, candidates, applications and published careers. Workspace-scoped constraints and permissions.
- Arabic-first RTL / English recruitment views; jobs and candidate management, stage filters, actionable attention counts, server-accurate company/job statistics.
- Publish/unpublish/close with publish validation (location and meaningful job description; drafts stay easy).
- Internal candidate reuse/duplicate reduction, unique job/candidate database constraint and clear already-applied response.
- **New P0:** public no-account application form at `/careers/{workspaceSlug}` when all protection conditions are satisfied:
  - Company opt-in + HTTPS privacy policy URL.
  - `RECRUITMENT_PUBLIC_APPLY_ENABLED=true` and Turnstile keys provided on that deployment.
  - Server-side Turnstile verification, origin check, per-IP throttling, minimal contact fields, idempotent UUID submit key, D1 transactional candidate/application/stage-history creation, campaign UTMs.
- Authenticated stage history timeline, changing stage records actor/time; scoped query never accepts a client tenant ID.
- `noindex` on incomplete career/demo pages.
- Smoke coverage: `node tools/recruitment-db-smoke.mjs` PASS with real SQLite constraints; synthetic D1 preview database migration and unique/transition checks PASS.

**Important:** public intake is **fail-closed by default** and is **not active** in the existing demo, which remains a browser-only UX simulation with synthetic data. Candidate PII must NOT be entered in that demo.

## Remaining required before a real pilot

1. Full `pnpm run check`, `pnpm run build`, and E2E on the upstream Node `^26.13.0` toolchain, using CI runner with adequate memory. Not yet achieved (prior sandbox install killed exit 137; remote syntax-only scan is not a full build).
2. Deploy isolated authenticated SaaS Staging (not the standalone UX Worker), configure Auth/D1/Turnstile and execute real end-to-end test with synthetic users.
3. Private R2 CV upload, validation, malware scanning, private retrieval and deletion — currently **not implemented**.
4. Scoped Recruiter/Interviewer roles, scheduling, feedback, error and keyboard/mobile E2E, and server-side pagination.
5. PDPL privacy/retention/deletion/subject-rights, data-processing and cross-border assessment, backup restore test, monitoring, incident response and rate-limit table expiration cleanup.
6. Source/UTM reporting and integrations, self-onboarding, subscriptions and customer support for commercial V1.

## References
- [Full product, friction, security and release audit](PRODUCT_AUDIT_UX_SECURITY_ROADMAP_AR.md)
- [P0 actual delivery and test evidence](P0_IMPLEMENTATION_REPORT_AR.md)
- [Standalone Workers UX demo](../../preview/README.md)

## CI & release instructions

Do not merge or enable real public intake until release blockers pass. Treat this branch as a draft feature branch, keep the existing app and personal Cloudflare resources untouched, and only use synthetic data in staging.
