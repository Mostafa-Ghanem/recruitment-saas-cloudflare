# HireFlow — تقرير تشغيل CI وجاهزية Staging

**التاريخ:** 3 نوفمبر 2026  
**الفرع:** `develop/recruitment-saas`  
**الحالة:** P0 ما زال Draft وغير جاهز لاستقبال متقدمين حقيقيين. `master` لم يتغير.

## ما تم تنفيذه والتحقق منه
1. إعادة تفعيل GitHub Actions في Fork الخاص بالمشروع بعد أن كانت workflows في حالة `disabled_fork`.
2. تشغيل `CI` الفعلي على GitHub-hosted runners بدل الاعتماد على فحص Syntax في sandbox ذاكرة 1 GB.
3. إضافة مسارات التوظيف `/careers/$workspaceSlug` و`/workspaces/$workspaceSlug/recruitment` إلى ملف TanStack Router المولد بالكامل، مع إصلاح خطأ ناتج عن نسخة مقطوعة سابقًا من الملف.
4. تصحيح ثلاثة ملفات ترحيل قاعدة البيانات إلى الصيغة التي يتوقعها Drizzle ومشغل migration في المشروع (`--> statement-breakpoint`).
5. إصلاح أنواع D1 والأخطاء المكتشفة من TypeScript؛ النوع والـBuild نجحا في تشغيل CI بعد التصحيح.
6. اختبارات `packages` و`capabilities` وAlchemy-local وE2E shards 1/2 وE2E الإضافي نجحت في أحد تشغيلات CI المُعالجة.
7. استبدال عناصر النماذج الأصلية بمكونات الواجهة المشتركة في المشروع، وإعادة استخدام TurnstileWidget الموجود مع إضافة `action=recruitment_apply`.
8. تقليل أخطاء Lint من 517 إلى **127** في إحدى تشغيلات CI بعد فصل Worker المعاينة عن فحوص التطبيق، مع بقاء بعض مخالفات UX وEffect والـstyle التي تحتاج إصلاحًا. أُجريت تعديلات إضافية بعدها؛ لا توصف بأنها ناجحة حتى تحقق CI اللاحق.
9. إنشاء بيئتي GitHub: `preview` و`preview-cleanup` لنشر PR مستقل وتنظيفه، **بدون** أسرار أو نشر تلقائي حتى تكتمل شروط الأمان.

## أدلة GitHub Actions
- أول Build ناجح: https://github.com/Mostafa-Ghanem/recruitment-saas-cloudflare/actions/runs/41610762676
- تشغيل CI بعد إصلاح مسارات TanStack والترحيلات: https://github.com/Mostafa-Ghanem/recruitment-saas-cloudflare/actions/runs/41611944350
- تشغيل أظهر تقلص Lint إلى 127 خطأ مع Build ناجح: https://github.com/Mostafa-Ghanem/recruitment-saas-cloudflare/actions/runs/41613926174
- تابع أحدث حالة في https://github.com/Mostafa-Ghanem/recruitment-saas-cloudflare/actions

**لم يتم إثبات نجاح كامل CI بعد، ولا نشر TanStack SaaS إلى Workers Staging، ولا اختبار إرسال طلب متكامل على نطاق منشور.**

## لماذا لم يتم نشر Staging الآن؟
Workflow `.github/workflows/preview.yml` يستخدم إعداد `vars.PREVIEW_ENABLED == 'true'` مع بيئة GitHub `preview` ويحتاج ثلاثة أسرار منفصلة لا تُرسل إلى المحادثة أو Git:
- `PREVIEW_CLOUDFLARE_API_TOKEN` بصلاحيات محدودة حسب ما تتطلبه Alchemy وCloudflare في حساب شخصي مخصص للتجربة.
- `PREVIEW_CLOUDFLARE_ACCOUNT_ID` للحساب المصرح.
- `PREVIEW_BETTER_AUTH_SECRET` سر جديد عشوائي لا يقل عن 32 حرفًا **غير مطابق لسر الإنتاج**.

لم تكن هذه الأسرار موجودة في Fork، وبالتالي لا يمكن تمكين Workflow بطريقة مسؤولة الآن. يجب إنشاء كل Secret داخل GitHub Environment `preview`، ونسخها للبيئة `preview-cleanup` عند الحاجة إلى تدمير موارد PR. بعد ذلك يمكن ضبط Repository Variable `PREVIEW_ENABLED=true` ثم تشغيل حدث PR synchronize، بشرط أن يكون CI ناجحًا، وأن تحفظ بيئة Staging بيانات **وهمية فقط**.

## Release gates المتبقية قبل بيانات حقيقية
- Lint/format/typecheck/build/test جميعها Green على نفس SHA؛ E2E اختبارات خاصة برحلة التقديم وTurnstile وCSRF وmulti-tenancy.
- حماية Staging بمصادقة/Access أو على الأقل تشغيل data-synthetic-only مع تعطيل `RECRUITMENT_PUBLIC_APPLY_ENABLED` افتراضيًا.
- إدارة خاصة للسير الذاتية على R2، فحص نوع وحجم/محتوى الملفات، RBAC وحقوق البيانات/الاحتفاظ/الحذف ومراجعة PDPL.
- تحقق من backup & restore ومن حدود D1 والتكلفة والمراقبة قبل Pilot.
- نشر على نطاق منفصل بعيد عن المشروع الحالي وعن Worker UX demo.

## سياسة التنفيذ
- لا تضع كلمة مرور أو API Token في Docs/Git أو رسائل دعم عامة.
- لا تنشر `master` ولا تفعل استقبال بيانات حقيقية قبل Release Gates.
- بيئتا `preview` و`preview-cleanup` مجرد إعداد GitHub حالياً، ولا تعنيان أن Workers/D1 الخاصين بـSaaS منشوران.

## متابعة 3 نوفمبر — ضبط المسؤولية القانونية واختبار الإصدار
- أزيلت هوية مسؤول الخصوصية وبريد التواصل الافتراضيان الموروثان من المشروع الأصلي. لم تُستبدل ببيانات وهمية؛ يجب تعريف `PRIVACY_CONTROLLER_NAME` و`PRIVACY_CONTACT_EMAIL` الحقيقيين بعد تحديد المسؤول القانوني قبل أي إطلاق إنتاجي.
- أضيف اختبار `node tools/recruitment-db-smoke.mjs` إلى خطوة CI Quality، ليمنع نجاح الفحص دون إثبات عزل الشركات، سلامة الترحيلات والتكرار والسجل.
- **تنبيه التكلفة:** ملف Alchemy الحالي يخطط لنشر D1 وعدة Cloudflare Queues وثلاثة Workers، وليس Worker واحدًا. لا تفعّل Preview على الحساب الشخصي حتى تتم مراجعة التكلفة وحصص الخطة والحد الأدنى من صلاحيات API Token.
