# Cloudflare ATS implementation handoff

Source fork: brandhaug/b2b-saas-starter. Work only on `develop/recruitment-saas` until reviewed.

## Current stack (verified from repository)
- TanStack Start app at `apps/web`; REST/MCP at `apps/api`; background Worker.
- Shared D1 / Drizzle schema in `packages/db/src/schema.ts`, workspaces/authz already exist.
- Effect services live in `packages/capabilities`; API contracts in `packages/api`.
- Localization exists in `packages/i18n` via Paraglide. **Current locales are en and nb** (Norwegian), NOT Arabic.
- Deployment is Alchemy and `pnpm run deploy`; build uses Vite+ CLI (`vp`), Node 26 and pnpm.
- See `docs/setup.md`, `docs/deploying.md`, `packages/i18n/AGENTS.md`.

## First implementation slice
- Introduce recruitment domain tables and migrations for jobs, candidates, applications, stages, notes and interview scheduling.
- Reuse *existing* workspace membership and authorization checks; do not implement duplicate auth.
- Add service operations in capabilities, then REST/web routes and public applications.
- Add private R2 binding for CV files after IaC review. Public downloads must require short-lived authorization.
- Add ar-SA as a supported locale and remove Norwegian **only after** translating all existing domain catalogs and adapting locale resolution, route strategies, Intl and the tests. Do not simply change `LOCALES`: build validation enforces complete catalogs and placeholder matches.
- Configure RTL at document + component layout levels; phone/email/LTR snippets remain LTR.
- Preserve workspace billing, existing roles and upstream security conventions.

## Tests / deployment
Local: `vp install`, `pnpm run dev`, `pnpm run check`, `pnpm run validate`. The upstream script compiles message catalogs and runs builds/E2E.
Previews must use demo data only. Provision stage-specific D1 and R2; never touch existing unrelated Cloudflare databases.
No domain, payment, secrets, live deployment or automatic release is authorized by this document.

## Operational caution
Default starter is a reference platform, not a finished ATS. Cloudflare Workers alone do not run the PHP OpenCATS application. This fork is the long-term SaaS track.
