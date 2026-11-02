# Saudi Arabic / English localization glossary (approved implementation target)

Current status: text contract only — the UI and notification catalogs have NOT been translated.

| Key | ar-SA | en |
|---|---|---|
| nav.jobs | الوظائف | Jobs |
| nav.candidates | المرشحون | Candidates |
| nav.applications | طلبات التوظيف | Applications |
| nav.interviews | المقابلات | Interviews |
| nav.team | فريق التوظيف | Hiring team |
| nav.reports | التقارير | Reports |
| nav.settings | الإعدادات | Settings |
| job.create | إضافة وظيفة | Create job |
| job.publish | نشر الوظيفة | Publish job |
| job.draft | مسودة | Draft |
| job.open | متاحة للتقديم | Open |
| job.closed | مغلقة | Closed |
| apply.submit | إرسال طلب التوظيف | Submit application |
| apply.fullName | الاسم الكامل | Full name |
| apply.phone | رقم الجوال | Mobile number |
| apply.email | البريد الإلكتروني | Email |
| apply.cv | السيرة الذاتية | CV / Resume |
| apply.success | تم استلام طلبك بنجاح | Application received |
| stage.new | طلب جديد | New |
| stage.screening | المراجعة الأولية | Screening |
| stage.shortlisted | القائمة المختصرة | Shortlisted |
| stage.interview | المقابلة | Interview |
| stage.offer | العرض الوظيفي | Offer |
| stage.hired | تم التوظيف | Hired |
| stage.rejected | غير مؤهل | Rejected |
| stage.withdrawn | انسحب | Withdrawn |
| team.recruiter | مسؤول توظيف | Recruiter |
| team.hiringManager | مدير التوظيف | Hiring manager |
| team.interviewer | مسؤول المقابلة | Interviewer |

## RTL acceptance criteria
- `<html lang="ar-SA" dir="rtl">` for Arabic, LTR for English.
- Navigation, drawers, breadcrumbs, modals, tables, calendar layouts, Kanban ordering and arrows must be tested in both directions.
- Phone numbers, email addresses, URLs and code remain LTR, with safe bidirectional isolation.
- Saudi locale formatting: dates/times and phone normalization; store dates in UTC, render in chosen timezone.
- Translate server-side validation, emails, notifications and public careers pages, not just buttons.

## Implementation warning
Cloudflare starter currently ships `en` + `nb`; changing the locale set without full catalogs fails its build-time validation. OpenCATS is PHP with legacy template strings; locate user-facing strings and provide an extraction plan before replacing them.
