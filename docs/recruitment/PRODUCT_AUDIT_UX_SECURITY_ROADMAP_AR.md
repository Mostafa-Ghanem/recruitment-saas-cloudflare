# HireFlow ATS — تدقيق المنتج وتجربة المستخدم والأمان وخطة التطوير
> نسخة تنفيذية عربية — 2 نوفمبر 2026. الهدف: Saudi-first employer ATS.
>
> **الحالة:** تحليل وتخطيط وتعديلات على فرع التطوير، وليس إعلان جهوزية تجارية. `master` لم يُدمج. معاينة Workers الحالية للـUX فقط وبياناتها وهمية ولا تحفظ التغييرات.

## 0. القرار التنفيذي والتموضع

- **العميل الأول:** شركات سعودية صغيرة ومتوسطة توظّف مباشرة وتفتقر لفريق عمليات توظيف متفرغ؛ يمكن اختيار شركات العقارات والخدمات كبداية للاختبار، لكن المنتج غير محصور في صناعة واحدة.
- **الوظيفة التي يشتريها العميل:** "أنشر الوظيفة، اجمع المتقدمين، اختَر المناسب، واعرف أي مصدر وظّفني — من مكان واحد".
- **فرضية USP، وليست حقيقة مثبتة:** ATS عربي أصيل مريح على الهاتف + نموذج تقديم بلا حساب + إسناد مصدر المرشح للإعلان وإكماله حتى التوظيف + إعداد شركة أسرع من حلول ضخمة. المنافسون يقدمون أجزاء من ذلك؛ إثبات التفوق يحتاج اختبار مستخدمين ومقارنة فعليّة.
- **لا نبدأ بـ:** Payroll، HRMS شامل، ربط جميع Job Boards، نسخ HRIS قائم، ترتيب AI آلي يرفض المتقدمين، أو Enterprise SSO قبل إغلاق رحلة التوظيف الأساسية.

## 1. الحقيقة التقنية — ما الموجود وما ليس موجودًا

| السطح | موجود في الكود | محفوظ فعليًا ومتاح في الإنتاج؟ | القيد |
|---|---|---|---|
| Worker UX Preview | عربى/إنجليزي/RTL؛ شركتان وهميتان؛ بطاقات وظائف ومرشحين؛ تعديل مراحل تجريبي؛ صفحات وظائف | **لا**، تعديلات المتصفح فقط | بيانات وهمية، لا Auth أو تقديم أو CV، API للكتابة معطلة |
| SaaS workspace route | لوحة ATS، إضافة/تعديل/نشر/إغلاق وظيفة، إضافة مرشح، مراحل، بحث، فلترة | **الكود مكتوب؛ لم يُثبت بناؤه/نشره** | مالك/Admin فقط؛ لا اختبارات E2E كاملة |
| قاعدة بيانات ATS | D1 jobs/candidates/applications، workspace FK وعلاقات مركبة | ترحيل واختبار SQLite محلي؛ ليس Migration إنتاجي | تحتاج تجربة نشر مع نسخة تاريخ قاعدة بيانات آمنة |
| Careers page | قائمة بالوظائف المنشورة فقط | موجودة في الكود؛ لا تقديم | مؤقتًا `noindex` حتى تتوفر وسيلة تقديم متوافقة مع متطلبات محركات البحث |
| دورة التوظيف الكاملة | غير مكتملة | لا | لا Applicant form، interview، feedback، stage history، CV/private R2 |
| إدارة SaaS | Better Auth/workspaces في Starter | الأساس موجود؛ تكامله بالـATS غير مختبر بإنتاج | لا اشتراكات ولا self-onboarding/roles المتخصصة |

**تعديلات السدّ الأولية في الفرع:**
1. عدّادات حقيقية عبر `COUNT(*)` لكل workspace؛ ما زال الجدول محدودًا بـ150 وظيفة/250 طلب حتى يضاف ترقيم الصفحات.
2. خطأ صريح لتعديل وظيفة/مرحلة مرشح لا وجود لها بدل نجاح وهمي.
3. مطابقة البريد واسم+جوال لتقليل تكرار المرشح، وإعادة استخدام هويته داخل الشركة؛ منع تكرار علاقة (job,candidate) بمؤشر D1 فريد. **ليس تحكّمًا متكاملاً ضد سباقات طلبين متزامنين بهويتين جديدتين**؛ لا يزال يحتاج استراتيجيات idempotency وunique normalization وتغطية سيناريوهات اختلاف الأسماء والأرقام.
4. `noindex,nofollow` مؤقتًا للوظائف قبل التقديم، والـDemo.
5. اختبارات D1 لحدود الشركات والفهارس والعدادات في `tools/recruitment-db-smoke.mjs`. لا يوجد Build/CI مكتمل بعد.

## 2. أهم رحلات المستخدمين — من البداية للنهاية

### رحلة A — مدير الشركة خلال أول 5 دقائق
1. ينشئ حسابًا أو يدخل برابط دعوة واضح؛ لا يُجبر على تكوين 10 إعدادات.
2. يرى اختيار "إنشاء أول وظيفة" مع قالب جاهز حسب المسمّى.
3. يدخل: المسمّى، المدينة/Remote، نوع الدوام (3 حقول أساسية). الوصف والراتب والمتطلبات بخطوة "تكميل التفاصيل" واختياري في المسودة.
4. معاينة عربية وإنجليزية إن توفر محتوى، ومراجعة شروط النشر (وسيلة تقديم، وصف كافٍ، هوية شركة صحيحة).
5. ينشر؛ تظهر URL قابلة للمشاركة، رمز QR/نسخ الرابط، والوظيفة في قائمة الشركة.
**UX acceptance:** مستخدم جديد ينشئ مسودة دون شرح؛ يستطيع استكمالها لاحقًا؛ خطأ الشبكة لا يفقد النص؛ لا نشر لو الاستقبال معطل.

### رحلة B — المرشح من إعلان هاتف إلى تقديم مكتمل
1. يدخل من URL خاص بالوظيفة؛ يشاهد المسمى، المكان، نمط العمل، نوع التعاقد، الخبرة، الراتب إن كان متاحًا، ملخصًا مختصرًا للشروط وهوية الشركة.
2. CTA واضح: "قدّم على الوظيفة"؛ زر ثابت على الهاتف عند التمرير عند الحاجة.
3. لا يُطلب إنشاء حساب أو كلمة مرور. نموذج أساسي: الاسم + جوال أو بريد؛ رفع CV **اختياري افتراضيًا** وقابل للتفعيل حسب الوظيفة؛ أسئلة تصفية لا تتجاوز 1–3 ومربوطة بالضروري.
4. Autofill `autocomplete=name,tel,email` مع `inputmode` مناسب للجوال؛ دعم لصق الرقم؛ استخراج الاسم من CV فقط بعد إذن ونتائج قابلة للتعديل، وليس AI parser إجباري.
5. تحقق جهة السيرفر للمدخلات + Turnstile Siteverify + rate limit + `idempotency_key`.
6. تأكيد فوري واضح "وصل طلبك" ورقم مرجعي وإشعار إذا كانت القناة تعمل؛ عدم الادعاء برسالة تم إرسالها إن لم تُرسل.
7. تعديل الطلب/حذفه أو سحب طلبه عبر رابط آمن صالح لفترة محددة حسب المتطلبات، بدون إظهار بيانات غير مصرح بها.
**UX acceptance:** لا تسجيل حساب/رفع CV إجباري في المسار الافتراضي؛ لا إعادة كتابة معلومات سبق تقديمها؛ تمييز مسودة محلية عن إرسال ناجح؛ لا تكرار طلب مع النقر المزدوج.

### رحلة C — مسؤول التوظيف صباحًا
1. يدخل على "تحتاج انتباهك" لا Dashboard مزدحم فقط: طلبات جديدة، مقابلات اليوم، مرشحون بلا متابعة، وظائف قاربت الإغلاق.
2. اختيار وظيفة، ترتيب الطلبات، فتح ملف مرشح موحد فيه CV، مصدره، تاريخ المراحل، ملاحظات وتقييمات.
3. إجراءات 1–2 نقرة: انتقال مرحلة، تعيين مسؤول، تحديد موعد، إرسال رسالة باستخدام Template.
4. إجراءات دفعات بعد معاينة عدد المتأثرين وتأكيد غير قابل للالتباس للحذف أو الرفض الجماعي.
**Acceptance:** كل تغيير مرحلة يسجل `actor_id, from_stage, to_stage, occurred_at, reason(optional)`؛ عرض واضح لمن غيّر ماذا ومتى.

### رحلة D — مدير التوظيف/المحاور
يدخل من دعوة محدودة الصلاحيات إلى المرشحين المكلّف بمراجعتهم، يرى معايير مقابلة محددة مرتبطة بالوظيفة، يسجّل ملاحظات/scorecard؛ لا يحتاج الوصول لكل بيانات المرشحين أو إعدادات الشركة أو الفواتير. تقييم المواضيع المهنية متسق، ولا حكم آلي نهائي قائم على AI.

### رحلة E — مسوّق التوظيف
ينشر روابط مختلفة لنفس الوظيفة مع UTM؛ يجد لوحة `Visits → Apply Started → Submitted → Qualified → Interviewed → Hired`. يراجع صِدق الإنفاق والمخرجات ويحافظ على خصوصية PII، فلا يرسل أسماء أو إيميلات أو CV إلى أدوات الإعلانات. جودة المرشح تُقرّ بواسطة مسؤول توظيف، وليس بعدد النقرات.

### رحلة F — مالك عدة شركات أو وكالة
يبدل الشركة بوضوح شديد، ويرى مساحة مستقلة لكل شركة (الوظائف والبيانات والأعضاء والفواتير)، مع إمكانيات متعددة الشركات وفق صلاحية حسابه فقط. لا تعرض الواجهة أرقام شركة أخرى، ولا ينفذ API استعلامًا من tenant_id أرسله المستخدم مباشرة.

## 3. مصفوفة المشاكل والاحتكاك (Friction)

| المشكلة | لماذا تؤثر على التحويل/الثقة | العلاج | اختبار قبول |
|---|---|---|---|
| صفحة وظيفة بلا زر تقديم | فقدان الزوار وثقة ضعيفة | أولوية P0، نموذج تقديم آمن | التقديم يصل D1 مرة واحدة |
| CV إجباري من الهاتف | إيقاف مرشح مناسب | CV اختياري إلا عند ضرورة الوظيفة | إكمال بلا CV ممكن |
| سؤال معلومات متكررة | إهدار وقت وانسحاب | Autofill، لا تكرار، حفظ محلي مؤقت | Resume form يعمل على الهاتف |
| لا صفحة شكر حقيقية | شك هل الطلب وصل | رقم طلب وتأكيد خادمي | Success فقط بعد Commit |
| لا ملف مرشح موحد | نسخ وفوضى بين الوظائف | Candidate + Applications منفصلة | لا يكرر الشخص نفسه عند عمل عدة طلبات |
| Pipeline بلا تاريخ | عدم مساءلة ولا فهم | Append-only stage history | تغيير وإرجاع لا يفقد السجل |
| خطأ الشبكة يلغي المدخلات | خسارة طلب كامل | حفظ مسودة محليًا، Retry آمن | إعادة المحاولة بلا Duplicate |
| نوافذ Modal لا تحترم لوحة المفاتيح | تعثر وإمكانية إتاحة ضعيفة | Focus trap، Escape، aria-labels، Restore Focus | WCAG 2.2 AA smoke |
| أنظمة مستخدمين بلا صلاحيات توظيف | كشف PII أو إعاقة المحاور | RBAC/ABAC حسب الدور والوظيفة | اختبارات 403 لكل دور |
| غياب بيانات المصدر | هدر إعلانات دون معرفة الجودة | Attribution عبر ID/UTM ومراحل | Report يحسب cost per qualified |
| ترقيم صفحات غير موجود | بطء وأرقام ملتبسة | Pagination بالـkeyset + server filtering | 10k طلب قابل للبحث دون تحميل الكل |
| CV على روابط عامة | تسريب ملفات | R2 خاص + short-lived signed reads | رابط منتهٍ يرفض + audit |
| حفظ أجزاء من نموذج غير مكتمل بدون إعلام | مخاطرة خصوصية | حفظ محلي أولًا؛ حفظ خادمي اختياري بعد إشعار/أساس مشروع وTTL | لا تسويق لـ"مسودة" على أنها "طلب مكتمل" |

## 4. تصميم UX — قواعد حاسمة

**نظام الملاحة:** الوظائف، المرشحون، المقابلات، التقارير؛ الإعدادات وأعضاء الفريق في إدارة الحساب وليس وسط العمل اليومي. لا أكثر من CTA رئيسي واحد لكل شاشة؛ مكوّنات Progressive Disclosure: المعلومات الأساسية أولًا، المتقدم لاحقًا.

**قائمة الوظائف:** البحث، الحالة، القسم، المدينة، نطاق النشر، اسم المدير؛ أهم الأعمدة (المسمى/المرشحون الجدد/الحالة/آخر تحديث). Dropdown واضح للإجراءات الثانوية. عرض البطاقات على الموبايل.

**ملف المرشح:** اسم وجوال واضحان مع حماية الظهور حسب الدور؛ 3 أقسام: ملخص المرشح، خط سيره بالزمن، الملفات/الملاحظات. إجراءات ثابتة "الخطوة التالية" و"تواصل". لا 12 Tabs متداخلة.

**المرشح على الهاتف:** شريط تقدم عند أكثر من خطوة، لكن تجنب خطوات ما لم تكن ضرورية؛ أخطاء بجوار الحقول فورًا وبأمثلة؛ عدم فقدان القيم؛ fallback لمديري كلمات المرور والنسخ/اللصق. لغة عربية طبيعية، محاذاة رقم الهاتف والإيميل LTR داخل RTL.

**حالات النظام:** Empty، Loading skeleton، Validation error، Rate limited، Session expired، Network timeout، Duplicate candidate، Job expired، Interview conflict، Permission denied، Upload rejected، Success. يجب تصميمها جميعًا، لا شاشة النجاح فقط.

**Accessibility:** مستوى WCAG 2.2 AA مستهدف مع keyboard navigation، focus ring، contrast، error summary، بديل للسحب والإفلات، دعم zoom 200% واسم/تسمية كل Form Control.

**تجارب A/B لاحقًا (لا تُنفذ قبل التتبع):** One-screen vs progressive form، CV optional vs job-specific required، نص الزر، عرض الراتب عند توفره؛ تقاس بالمكتمل **وجودة** المتقدم، وليس الضغط فقط.

## 5. معمارية المنتج المستقبلية

### Data model minimum
- Tenant/Workspace: `id, slug, locale, legal_name, billing_status`
- Job: `tenant_id, status, description, requirements, posting_channels, published_at, expires_at, application_policy`
- Candidate: `tenant_id, identity/contact normalization, created_at, retention_state`
- Application: `tenant_id, candidate_id, job_id, current_stage_id, source_id, submitted_at, withdrawn_at, idempotency_key`
- StageHistory: `tenant_id, application_id, actor_id, before, after, occurred_at, note`
- Interview: `tenant_id, application_id, interviewer_ids, starts_at, timezone, status, feedback`
- Attachment: `tenant_id, candidate_id, object_key, checksum, mime, size, scan_status`
- Consent/NoticeReceipt: `tenant_id, candidate_id, notice_version, lawful_basis, timestamp, source` (لا نفرض موافقة في كل حالة إن كانت المعالجة تستند إلى أساس نظامي مختلف، يُحسم قانونيًا)
- CandidateSource: `utm_source, utm_medium, utm_campaign, utm_content, referrer, click IDs`
- AuditEvent: `tenant_id, actor_id, action, target_id, timestamp, no_sensitive_payload`

### Architecture
Workers SSR + Better Auth، D1 للبيانات والفهارس، R2 خاص للسير الذاتية، Queues للإشعارات ومزامنة الأنظمة، Turnstile server verify، Rate Limiting، مراقبة latency/errors، logging بدون PII، backups & recovery drills. `DB` و`R2` وqueue في مراحل staging/production منفصلة. لا خلط بين demo وبيانات عملاء.

ملاحظة: D1 Free له حصص قراءات/كتابات يومية على **مستوى الحساب** ومن الممكن أن يتعطل الاستعلام بمجرد بلوغها؛ لا تعتمد عليه كضمان خدمة إنتاجية. أضف تكلفة/حصة/تنبيه وقرارات ترقية بالاستعمال الفعلي.

### Security & privacy release blockers
- Authenticated actor + workspace membership على **كل** API وserver action وquery وexport وR2.
- No BOLA/IDOR: ممنوع جعل `tenant_id` في Body سلطة للوصول للبيانات.
- Role matrix: owner/admin/recruiter/hiring_manager/interviewer، وأذونات حسب job assignment حيث يلزم.
- Turnstile Siteverify **على الخادم** + rate limiting وhoneypot وتحقق حجم الملفات ومحتواها وفحصها قبل إتاحة CV.
- CSRF/Origin/session cookie safety، عدم إرسال معلومات مرشح داخل URLs أو analytics، CSP/XSS، brute-force limits.
- Retention schedule قابلة للضبط، GDPR/PDPL-like subject rights (العرض/التصحيح/الحذف/سحب الطلب) وسجل إجراءات.
- Data Processing Agreement ومسؤولية Controller/Processor، دراسة نقل البيانات خارج السعودية؛ لا نفترض أن تخزين D1 خارج السعودية متوافق تلقائيًا.
- Event and incident management وسياسة التعامل مع تسرب البيانات، اختبار الاستعادة من backup، فصل الصلاحيات والموارد.
- لا تنشر عامة أو تسمح بتجميع بيانات حقيقية قبل إتمام الحد الأدنى أعلاه.

## 6. Analytics & USP proof

| حدث | متى يرسل؟ | جهة التتبع |
|---|---|---|
| `job_viewed` | عرض صفحة وظيفة عامة، bot filtered | Analytics aggregate |
| `apply_started` | بدأ مرشح فعلي نموذج التقديم، dedup session | Analytics pseudonymous |
| `application_submitted` | حفظ تطبيق كامل في D1 بنجاح | Server-authoritative |
| `application_qualified` | Recruiter يؤكد استيفاء معايير الوظيفة | ATS private event |
| `interview_scheduled` | موعد مقابلة حُفظ وتأكد | ATS private event |
| `candidate_hired` | الوصول إلى حالة Hired مع بيانات موثوقة | ATS private event |

**المعادلات:**
- Application Completion Rate = `completed applications / apply_started` لنفس النطاق والفترة بعد إزالة التكرار.
- Qualified Application Rate = `qualified applications / submitted applications`.
- Cost per Qualified = `attributed campaign spend / qualified applicants`.
- Interview-to-Hire = `hired / interviewed` للدفعات الزمنية المحددة.
- Time to First Response = `first recruiter response - submitted_at`.
- Time to Fill = `hired_at - job_opened_at` (حدد سياسة إعادة الفتح).

**Attribution caveat:** ليست كل المنصات توفر تكلفة/بيانات Click ID بسهولة؛ نبدأ UTM وmanual CSV cost import ثم التكاملات المصرح بها. نماذج 1st-touch / last-touch تختار صراحة؛ لا تدعي دقة 100%. ممنوع إرسال جوال/اسم/CV إلى بكسلات الحملات؛ التتبع التسويقي خاضع للأساس القانوني وسياسة الموافقات عند الاقتضاء.

## 7. الاعتراضات السوقية والرد المطلوب داخل المنتج

| اعتراض | رد مقنع قابل للتحقق — وليس وعدًا تسويقيًا |
|---|---|
| "عندي Excel أو WhatsApp" | CSV import/export ومسؤولية واضحة للمرشح داخل Pipeline بدلاً من الضياع بين المحادثات |
| "Zoho أو Workable أكبر" | 5 مهام رئيسية وتجربة عربية أسرع للفريق الصغير مع اختبار ميداني، وليس ادعاء مزايا لا يملكها المنافس |
| "المرشح مش هيسجّل" | لا حساب للمرشح في المسار الأساسي |
| "مين يشوف البيانات؟" | أدوار، سجل اطلاع/تغيير، DPA، حذف وتصدير، إظهار قواعد الاحتفاظ |
| "لو اشتركت وأردت الخروج؟" | Export بيانات قابل للاستخدام، مهلة انتقال محددة، حذف بعد انتهاء العلاقة |
| "هل هعرف أي إعلان جاب موظف؟" | عرض مصدر UTM، وتقدم المرشح حتى hired، ومصدر تكلفة مُتحقق منه |
| "الموقع واقع والتقديم ضاع؟" | Retry/idempotency، مراقبة، alerting، backup/restore؛ لا تدعي ضمان SLA قبل قياسه |
| "هل إرسال WhatsApp مجاني؟" | لا؛ يحتاج اتصال معتمد وأسعار وسياسة Opt-in، يوضح ضمن Plan |
| "هل AI هيرفض أشخاص؟" | لا رفض آلي؛ توصيات قابلة للتفسير ومراجعة بشرية وقياس تحيز قبل أي ML |

## 8. الأولويات وأوامر التنفيذ

### P0 — شروط تشغيل حقيقية (لا إطلاق Pilot ببيانات حقيقية دونها)
- [ ] Build `Node 26.13+` ناجح، `pnpm run check` واختبارات حقيقية CI.
- [ ] نشر TanStack Starter في Staging **منفصل** بقاعدة D1/Secrets وبدون البيانات الوهمية.
- [ ] Signup/login/organization/tenant permission E2E؛ Owner/Admin/Recruiter roles.
- [ ] Public job detail & secure application intake + server-authoritative submit.
- [ ] CV optional/upload to private R2 مع validation/scan/short-lived access.
- [ ] Per-job candidate deduplication + idempotency across retries/races (التخفيف الحالي غير كامل).
- [ ] Stage timeline immutable + candidate profile.
- [ ] Privacy notice, lawful basis, export/deletion/retention + DPA/legal assessment.
- [ ] Pagination, server filtering, accurate counters; failure/retry UX.
- [ ] Monitoring, backup restoration drill, incident contacts.
- [ ] Saudi Arabic/English parity + keyboard & mobile E2E.

### P1 — منتج استخدام يومي ممتاز
- [ ] Interview scheduling, timezone and interviewer availability, scorecards.
- [ ] Email templates + delivery status + in-app reminders.
- [ ] Source/UTM attribution + qualified metrics + dashboard by job.
- [ ] Job templates, approvals, drafts, publish validation/expiration.
- [ ] Bulk actions, saved filters, CSV import/export with audit.
- [ ] Recruiter/Hiring Manager scoped task inbox, assignments and notifications.
- [ ] SaaS self-onboarding, subscription & limits and dunning/upgrade states.

### P2 — التميز القابل للبيع
- [ ] Odoo approved integration contract (scoped tokens/webhooks/retries).
- [ ] WhatsApp Business API integrations with opt-in & templates.
- [ ] Agency multi-client workflow, white label/custom domains.
- [ ] AI-assisted job description and CV summarization (human-in-loop, no auto-reject).
- [ ] Additional job boards and media APIs only where authorized.
- [ ] Advanced cost attribution, cohort analysis, pipeline velocity by source.

## 9. Definition of Done / release gates

**Working MVP:** من حساب مسؤول شركة → نشر وظيفة → مرشح يقدّم من هاتف → طلب محفوظ مرة واحدة → مسؤول يراجع الملف → ينقله ويُعلّق/يحدد مقابلة → يختار قرارًا → يصل تأكيد؛ كل ذلك مع Tenant isolation وفشل/إعادة محاولة مغطاة بالاختبارات.

**Private Beta:** شركتان فعليتان متباينتان، بيانات مختبرة بموافقات وسياسات واضحة؛ لا تسريب عبر URL/export/search/file، نتائج اختبار mobile/RTL/keyboard؛ مراقبة SLA والنسخ الاحتياطي والاستعادة ومتابعة الأخطاء.

**Commercial V1:** onboarding/billing وحق الاستخدام والخروج، فريق دعم وتذاكر، شروط وخصوصية وDPA وسلامة بيانات ونقلها متحقق منها، observability وincident playbook، اختبار ضغط وتكلفة مناسبة وقياس قيمة ميزة USP ميدانيًا.

**لا تُفترض أيام/مواعيد تسليم نهائية قبل Build ناجح ثم اختبار مسار توظيف حقيقي.**

## 10. مصادر مرجعية
- Competitors: https://www.zoho.com/recruit/key-features.html
- Workable: https://get.workable.com/
- Google JobPosting content/SEO: https://developers.google.com/search/docs/appearance/structured-data/job-posting
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Cloudflare Turnstile verification: https://developers.cloudflare.com/turnstile/get-started/
- Cloudflare R2 presigned private links: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare D1 pricing and enforced limits: https://developers.cloudflare.com/d1/platform/pricing/
- SDAIA PDPL guide: https://dgp.sdaia.gov.sa/
- PDPL cross-border transfer regulation and controller obligations should be reviewed with a qualified local advisor before real customer data.
