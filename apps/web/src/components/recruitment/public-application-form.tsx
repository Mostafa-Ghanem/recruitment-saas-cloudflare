import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRef, useState, type SyntheticEvent } from "react";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { CheckCircle2Icon, ShieldCheckIcon, XIcon } from "lucide-react";
import { submitPublicApplicationServerFn } from "@/lib/server/public-application";

export function PublicApplicationForm({
  workspaceSlug,
  jobId,
  jobTitle,
  company,
  siteKey,
  privacyPolicyUrl,
  locale,
  onClose,
}: {
  workspaceSlug: string;
  jobId: string;
  jobTitle: string;
  company: string;
  siteKey: string;
  privacyPolicyUrl: string;
  locale: "ar" | "en";
  onClose: () => void;
}) {
  const ar = locale === "ar";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [securityToken, setSecurityToken] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const submissionKey = useRef<string | null>(null);

  const language = ar ? "ar" : "en";
  const submitLabels = {
    ar: { sending: "جارٍ إرسال الطلب…", ready: "إرسال طلب التوظيف" },
    en: { sending: "Submitting…", ready: "Submit application" },
  };
  const confirmationTitles = {
    ar: { duplicate: "طلبك موجود بالفعل", success: "تم استلام طلبك بنجاح" },
    en: { duplicate: "Your application already exists", success: "Application received" },
  };
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!securityToken) {
      setSecurityError(
        ar ? "أكمل التحقق الأمني قبل التقديم." : "Complete the security check first.",
      );
      return;
    }
    if (!name.trim() || !(phone.trim() || email.trim())) {
      setError(
        ar ? "الاسم ووسيلة تواصل واحدة مطلوبان." : "Your name and one contact method are required.",
      );
      return;
    }
    setBusy(true);
    setError("");
    // oxlint-disable-next-line effect/noTryCatch -- UI event boundary maps network failures to an accessible retry state
    try {
      if (!submissionKey.current) {
        submissionKey.current = crypto.randomUUID();
      }
      const query = new URLSearchParams(window.location.search);
      const result = await submitPublicApplicationServerFn({
        data: {
          workspaceSlug,
          jobId,
          fullName: name,
          phone,
          email,
          turnstileToken: securityToken,
          submissionKey: submissionKey.current,
          utmSource: (query.get("utm_source") || "").slice(0, 120),
          utmMedium: (query.get("utm_medium") || "").slice(0, 120),
          utmCampaign: (query.get("utm_campaign") || "").slice(0, 120),
          utmContent: (query.get("utm_content") || "").slice(0, 120),
        },
      });
      setAlreadySubmitted(result.outcome === "already_submitted");
      setReference(result.reference);
    } catch {
      setError(
        ar
          ? "لم نستطع تأكيد إرسال الطلب. راجع البيانات وأعد المحاولة. لن يُكرر الطلب عند إعادة الإرسال."
          : "We could not confirm your application. Please retry. Your request will not be duplicated.",
      );
      setSecurityToken("");
      setTurnstileResetKey((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <section
        aria-live="polite"
        className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center"
      >
        <CheckCircle2Icon aria-hidden className="mx-auto mb-3 size-10 text-emerald-500" />
        <h4 className="text-xl font-semibold">
          {confirmationTitles[language][alreadySubmitted ? "duplicate" : "success"]}
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? "احتفظ بالرقم المرجعي للمتابعة:" : "Keep this reference for your records:"}{" "}
          <strong dir="ltr" className="font-mono text-foreground">
            {reference}
          </strong>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {ar
            ? "لا يعني استلام الطلب قبولك في الوظيفة."
            : "Receiving an application does not guarantee selection."}
        </p>
        <Button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-xl border border-border px-5 py-2 text-sm"
        >
          {ar ? "تم" : "Done"}
        </Button>
      </section>
    );
  }

  return (
    <section
      className="mt-5 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6"
      aria-label={ar ? "نموذج التقديم" : "Apply for this job"}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold">{ar ? "تقديم سريع" : "Quick application"}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{jobTitle}</p>
        </div>
        <Button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={ar ? "إغلاق النموذج" : "Close form"}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <XIcon className="size-5" />
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {ar
          ? "بدون إنشاء حساب. الاسم ووسيلة تواصل واحدة فقط."
          : "No account needed. Just your name and one way to reach you."}
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          void submit(e);
        }}
      >
        <Label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {ar ? "الاسم الكامل" : "Full name"} *
          </span>
          <Input
            required
            autoComplete="name"
            name="name"
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {ar ? "الجوال" : "Mobile phone"}
            </span>
            <Input
              type="tel"
              name="phone"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              placeholder="+9665…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </Label>
          <Label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
            </span>
            <Input
              type="email"
              name="email"
              dir="ltr"
              autoComplete="email"
              maxLength={250}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {ar
            ? `سيستخدم ${company} بياناتك للنظر في طلبك والتواصل بشأن الوظيفة. اطّلع على `
            : `${company} will use your details to assess and contact you about this role. Read the `}
          <a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline"
          >
            {ar ? "سياسة الخصوصية" : "privacy policy"}
          </a>
          .
        </p>
        <TurnstileWidget
          siteKey={siteKey}
          action="recruitment_apply"
          onToken={(token) => {
            setSecurityToken(token ?? "");
            setSecurityError(
              token
                ? ""
                : ar
                  ? "أعد إكمال التحقق الأمني."
                  : "Please complete the security check again.",
            );
          }}
          resetKey={turnstileResetKey}
        />
        {securityError && (
          <p role="alert" className="text-sm text-destructive">
            {securityError}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-4" />
            {ar ? "بياناتك لا تظهر للعامة" : "Your details are private"}
          </p>
          <Button
            type="submit"
            disabled={busy || !securityToken || !name.trim() || !(phone.trim() || email.trim())}
            className="min-h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitLabels[language][busy ? "sending" : "ready"]}
          </Button>
        </div>
      </form>
    </section>
  );
}
