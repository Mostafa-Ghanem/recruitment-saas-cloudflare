# Recruitment UX Preview (Cloudflare Workers)

Status: **live UX-only preview**, not the full TanStack SaaS deployment.

- URL: https://recruitment-ux-preview-nov02.mosstafaghanem.workers.dev/
- Worker: `recruitment-ux-preview-nov02`
- Account: personal Cloudflare account (not Aqar One/Grenada)
- D1: `recruitment-ux-preview-20261102` (isolated; never use for production)
- Source: `preview/worker.js` in this branch
- Source revision at deployment: `487ba808294d5217d1a61503799c00f077b76634`

## What it does
Public, synthetic-only UI walkthrough:
- Two demo organizations: Shownova and Aqar One.
- Dashboard, job creation/editing/publishing/filtering, applicants and stage changes.
- Arabic-first responsive RTL; language toggle to English.
- Public published job listing at `/careers/shownova` and `/careers/aqar1`.
- Read-only D1. API writes return 403; editing simulates changes in browser memory only.

## Safety notes
- **Do not enter real candidate personal data.** This is an anonymous demo and has no production authentication.
- All job/candidate operations in the dashboard simulate changes locally and reset on reload or switching organizations.
- No SaaS billing, Better Auth login, CV upload, email, Odoo integration, or public application collection.
- /api/data exposes **synthetic** demo fields only. No real users or production data.
- CSP, no-store responses and same-origin boundaries are enabled.
- `PREVIEW_PASSWORD` is deliberately **not configured**; this public UX-only version intentionally bypasses the unused login code and blocks mutation requests.
- Cloudflare confirmed Worker upload, workers.dev subdomain enablement, D1 binding and seed records. An independent HTTP page load was not verified due to web test tool access limitations.

## Full SaaS rollout
Full application source remains in `apps/web`, `packages/db` and other packages. The full build could not be completed in the previous resource-constrained environment. Do not confuse this standalone demo with an authenticated production deployment.

Next: run Node 26+ toolchain in a proper CI runner, fix full build/test failures, use a fresh stage D1, configure Better Auth and deploy the actual TanStack app with restricted access before handling real applicant data.
