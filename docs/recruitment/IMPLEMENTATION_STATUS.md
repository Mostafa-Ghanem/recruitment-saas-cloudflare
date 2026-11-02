# Recruitment MVP — implementation status

Branch: `develop/recruitment-saas`. PR #1 remains a draft. The code is **not deployed**.

## Implemented in this branch
- Workspace-scoped recruitment tables and a D1 SQL migration.
- Authenticated, owner/admin-only recruitment dashboard at `/workspaces/{workspaceSlug}/recruitment`.
- One-screen Arabic-first (ar-SA)/English UX: jobs, candidates, metrics, search, draft/published/closed filters.
- Create and edit jobs, publish/unpublish/close them.
- Add a candidate to a job and move their application through hiring stages.
- Public read-only career page at `/careers/{workspaceSlug}`, listing **only published jobs**.
- Reuses Better Auth membership and privileged-authentication/suspension gates before every private D1 query.
- Query scoping by resolved workspace ID; composite D1 foreign keys prevent cross-tenant application links.
- Dependency-free database test: `node tools/recruitment-db-smoke.mjs`.

## Intentionally NOT implemented yet
- Online public application intake, anti-bot Turnstile, R2 resume files, malware scans.
- Advanced recruiter/interviewer roles (MVP management is owner/admin only).
- Candidate deduplication, edit/delete, notes and stage audit history.
- Pagination across more than 150 jobs / 250 applications (aggregate dashboard counters now use independent full COUNT(*) queries).
- Email notifications and Odoo/webhook integration.
- Full Arabic localization of the inherited SaaS shell (the recruitment pages themselves are bilingual/RTL).
- Production deployment, comprehensive security review and successful full project build.
- Application audit/stage history, full concurrency-safe candidate identity deduplication, public applicant intake and legal review.

## Remediation since original audit
- Correct aggregate counters in D1; explicit not-found errors for stale job/application writes.
- Candidate reuse by tenant/contact and explicit already-applied UI; unique application/job/candidate index migration. Concurrent first-time identity races remain an unresolved risk.
- Public job pages temporarily noindex until compliant apply is available.
- Full product/UX/security roadmap: `docs/recruitment/PRODUCT_AUDIT_UX_SECURITY_ROADMAP_AR.md`.
- Standalone UX demo Worker is published, but its changes are not saved server-side; do not handle real candidate data there.

## Run / verify
1. Clone this branch; install upstream-required Node 26.13+, Vite+ and pnpm.
2. `vp install`; `pnpm run check` / `pnpm run build`.
3. `node tools/recruitment-db-smoke.mjs`.
4. Migrate isolated staging D1 using existing project script, **never an existing customer database without a backup**.
5. Use a staging Workspace with an owner account to test the dashboard.
6. Check desktop/mobile, Arabic RTL and English LTR and tenant boundary tests.
7. Deploy only after CI/build, real authentication and backups pass.

## External environment limitations observed
A separate sandbox clone ran a TypeScript syntax-only scan (no parse errors), and the SQL was validated with SQLite and FK enforcement. The full dependency install was killed (exit 137) in the resource-constrained sandbox while downloading the starter's dependencies. This does NOT prove the full project build passes. No Cloudflare deployment was made.
