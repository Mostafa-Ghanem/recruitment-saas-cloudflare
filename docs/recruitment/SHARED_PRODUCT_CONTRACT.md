# Recruitment ATS — shared product contract (v0.1)

Status: architecture and implementation handoff only. No production ATS features are implemented yet.
This contract is shared with the sibling fork so UX, routes and data semantics remain comparable.

## Product
A standalone bilingual (Arabic for Saudi Arabia / English) recruitment SaaS for multiple companies.
- Super Admin: platform tenants, plans, suspension, audit and billing.
- Company Owner/Admin: branding, career portal, jobs, pipeline, team permissions.
- Recruiter/Hiring Manager/Interviewer: scoped candidate operations.
- Applicant: public career portal and friction-minimized application process.

## MVP workflow
Company -> Job Draft -> Published job -> Public application -> Candidate in pipeline ->
Screening -> Interview -> Offer -> Hired / Rejected / Withdrawn.

Default application form: full name, contact phone, email (optional), CV (optional if job permits), portfolio/LinkedIn (optional), vacancy-specific screening questions.
Never collect more data than needed; provide a privacy notice, applicant deletion/retention workflow, and clear file-handling protections.

## Shared concepts
| Entity | Required relationships / example fields |
|---|---|
| Tenant | id, slug, legal_name, display_name, locale, status |
| Member | tenant_id, user_id, role, status |
| Job | tenant_id, id, title_ar, title_en, location, department, employment_type, status, published_at |
| Candidate | tenant_id, id, full_name, normalized_phone, email, source, created_at |
| Application | tenant_id, id, job_id, candidate_id, stage_id, source/UTM, submitted_at |
| PipelineStage | tenant_id, id, name_ar, name_en, sort_order, is_terminal |
| Interview | tenant_id, id, application_id, starts_at, meeting_location_or_url, interviewer_id, feedback |
| Attachment | tenant_id, id, candidate_id, private_storage_key, filename, mime, size |
| AuditEvent | tenant_id, actor_id, action, resource_id, timestamp, redacted_metadata |

## Default hiring stages
new -> screening -> shortlisted -> interview -> offer -> hired.
Terminal alternate: rejected, withdrawn. Keep the stages configurable per tenant and application stage history immutable.

## Tenant isolation and authorization — blocking release conditions
- Every private query, mutation, export, file access and background job must be tenant scoped.
- Tenant authorization comes from authenticated membership, never a client-submitted tenant_id.
- Cross-tenant access tests are mandatory for REST endpoints, server functions, exports, resume retrieval, search and webhooks.
- Resume files are private. Enforce type/size validation, malware handling, short-lived access and retention/deletion.
- Sanitize candidate PII in logs and analytics. Restrict permissions by role; audit changes.
- Protect public forms with rate limiting and anti-abuse controls. Do not let the public candidate list become searchable.

## UX + localization
- Arabic (ar-SA) and English (en); Arabic must use logical RTL, icon alignment, input direction and bidirectional phone/email layout.
- Persist tenant/user locale. Translate validation, notifications and public job pages.
- Use accessible responsive layouts; support mobile application, keyboard navigation and job-linked Kanban.

## Delivery gates
1. Source license/security review, no secrets in git.
2. Define data migrations + tenant-safe business layer.
3. Jobs CRUD / publish / public job page.
4. Applicant form + private CV storage + duplicate checks.
5. Pipeline + notes + audit + team roles.
6. Interviews + email + webhooks/Odoo contract.
7. ar-SA/en catalogs, RTL visual tests, mobile E2E.
8. End-to-end acceptance and deployment review before production.

Never copy real applicant data to demo environments. Never deploy from this branch automatically.