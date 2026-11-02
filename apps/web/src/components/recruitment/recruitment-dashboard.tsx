import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  BriefcaseBusinessIcon, CheckCircle2Icon, CirclePlusIcon, Clock3Icon,
  FileUserIcon, MapPinIcon, SearchIcon, UsersRoundIcon, XIcon,
  ArrowUpRightIcon, SparklesIcon
} from 'lucide-react'
import {
  addRecruitmentCandidateServerFn,
  createRecruitmentJobServerFn,
  editRecruitmentJobServerFn,
  moveRecruitmentApplicationServerFn,
  updateRecruitmentJobStatusServerFn,
  saveRecruitmentApplicationSettingsServerFn,
  loadRecruitmentApplicationHistoryServerFn,
  type RecruitmentStageEvent,
  type RecruitmentOverview
} from '@/lib/server/recruitment'
import { WorkspaceShell } from '@/components/workspace-shell'

type Lang = 'ar' | 'en'
type Tab = 'jobs' | 'candidates'
type Dialog = 'job' | 'candidate' | null
type FormJob = { title: string; department: string; location: string; employmentType: string; description: string }
type FormCandidate = { jobId: string; fullName: string; phone: string; email: string }

const stages = ['new', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const
const initialJob: FormJob = { title: '', department: '', location: '', employmentType: 'full_time', description: '' }
const initialCandidate: FormCandidate = { jobId: '', fullName: '', phone: '', email: '' }

const words = {
  ar: {
    eyebrow: 'مساحة العمل / إدارة المواهب', title: 'التوظيف ببساطة',
    intro: 'كل وظيفة وكل مرشح في مكان واحد، بدون خطوات معقدة.',
    newJob: 'وظيفة جديدة', editJob: 'تعديل الوظيفة', saveChanges: 'حفظ التعديلات', viewPublic: 'عرض الصفحة العامة', addCandidate: 'إضافة مرشح', jobs: 'الوظائف',
    applicants: 'المرشحون', published: 'وظائف منشورة', inInterview: 'في المقابلة',
    search: 'ابحث عن وظيفة أو مرشح...', all: 'الكل', live: 'منشورة',
    draft: 'مسودات', closed: 'مغلقة', publish: 'نشر الوظيفة',
    unpublish: 'إيقاف النشر', closeJob: 'إغلاق الوظيفة',
    emptyJobs: 'لسه ما أضفتش أي وظيفة', emptyJobsBody: 'ابدأ بإضافة أول وظيفة، وبعدين تقدر تنشرها وتربط بها المرشحين.',
    emptyCandidates: 'مفيش مرشحين لسه', emptyCandidatesBody: 'أضف أول مرشح واختر الوظيفة المتقدم لها.',
    jobTitle: 'المسمى الوظيفي', department: 'القسم', location: 'الموقع',
    employment: 'نوع الدوام', description: 'الوصف الوظيفي',
    fullTime: 'دوام كامل', partTime: 'دوام جزئي', contract: 'عقد', internship: 'تدريب',
    name: 'اسم المرشح', phone: 'رقم الجوال', email: 'البريد الإلكتروني',
    job: 'الوظيفة', stage: 'مرحلة التوظيف', cancel: 'إلغاء', saveJob: 'حفظ كمسودة',
    saveCandidate: 'إضافة المرشح', quickJob: 'إنشاء وظيفة', quickCandidate: 'مرشح جديد',
    jobHint: 'المسمى الوظيفي فقط مطلوب. تقدر تكمل باقي التفاصيل بعدين.',
    candidateHint: 'الاسم وطريقة واحدة للتواصل كفاية.',
    saved: 'تم الحفظ بنجاح', alreadyExists: 'المرشح متقدم بالفعل للوظيفة، لم يتم تكرار طلبه.', failed: 'تعذر حفظ التغيير. حاول مرة أخرى.',
    noMatches: 'مفيش نتائج مطابقة', apply: 'طلب توظيف', chooseJob: 'اختر الوظيفة',
    open: 'مفتوحة', warning: 'الوظائف والمرشحون هنا خاصون بالشركة الحالية.',
    new: 'جديد', screening: 'مراجعة', shortlisted: 'القائمة المختصرة',
    interview: 'مقابلة', offer: 'عرض', hired: 'تم التوظيف',
    rejected: 'مرفوض', withdrawn: 'انسحب', candidatesTotal: 'طلبات التوظيف',
    attentionTitle: 'تحتاج انتباهك', attentionIntro: 'ابدأ بالطلبات التي تحتاج إجراء، بدل البحث في القوائم.', attentionNew: 'طلبات جديدة', attentionStale: 'طلبات متأخرة أكثر من 48 ساعة', attentionInterviews: 'في مرحلة المقابلة', candidateFilterAll: 'كل المراحل',
    publishRequirements: 'قبل نشر الوظيفة، أضف المدينة ووصفًا وظيفيًا واضحًا لا يقل عن 80 حرفًا. يمكنك حفظها كمسودة الآن.',
    privacyTitle: 'إعدادات استقبال التقديمات', privacyBody: 'لن يظهر نموذج التقديم حتى تضيف سياسة الخصوصية وتفعّل الاستقبال وتكتمل حماية الموقع.',
    privacyUrlLabel: 'رابط سياسة الخصوصية للشركة (HTTPS)', privacyEnable: 'السماح باستقبال طلبات التوظيف',
    privacyConfigured: 'حماية التقديم مهيّأة على السيرفر', privacyNotConfigured: 'حماية التقديم لم تُفعّل بعد على السيرفر — سيظل النموذج مغلقًا.',
    privacySave: 'حفظ إعدادات التقديم', previewOnly: 'الحماية والتفعيل إلزاميان قبل استقبال بيانات حقيقية.',
    switchLanguage: 'English'
  },
  en: {
    eyebrow: 'Workspace / Talent', title: 'Hiring made simple',
    intro: 'All your jobs and applicants in one clear place.',
    newJob: 'New job', editJob: 'Edit job', saveChanges: 'Save changes', viewPublic: 'View public page', addCandidate: 'Add candidate', jobs: 'Jobs',
    applicants: 'Candidates', published: 'Published jobs', inInterview: 'In interviews',
    search: 'Search jobs or candidates...', all: 'All', live: 'Published',
    draft: 'Drafts', closed: 'Closed', publish: 'Publish job',
    unpublish: 'Unpublish', closeJob: 'Close job',
    emptyJobs: 'No jobs yet', emptyJobsBody: 'Create a job, publish it, and start organizing candidates.',
    emptyCandidates: 'No candidates yet', emptyCandidatesBody: 'Add a candidate and link them to an existing job.',
    jobTitle: 'Job title', department: 'Department', location: 'Location',
    employment: 'Employment type', description: 'Job description',
    fullTime: 'Full time', partTime: 'Part time', contract: 'Contract', internship: 'Internship',
    name: 'Full name', phone: 'Mobile number', email: 'Email address',
    job: 'Job', stage: 'Hiring stage', cancel: 'Cancel', saveJob: 'Save as draft',
    saveCandidate: 'Add candidate', quickJob: 'Create job', quickCandidate: 'New candidate',
    jobHint: 'Only the job title is required. You can fill in the details later.',
    candidateHint: 'A name and one contact method are enough.',
    saved: 'Saved successfully', alreadyExists: 'This candidate already applied to this job. No duplicate was created.', failed: 'Could not save your changes. Please retry.',
    noMatches: 'No results match your search', apply: 'Application', chooseJob: 'Choose a job',
    open: 'Open', warning: 'Jobs and candidates are private to this workspace.',
    new: 'New', screening: 'Screening', shortlisted: 'Shortlisted',
    interview: 'Interview', offer: 'Offer', hired: 'Hired',
    rejected: 'Rejected', withdrawn: 'Withdrawn', candidatesTotal: 'Applications',
    attentionTitle: 'Needs your attention', attentionIntro: 'Start with the applications that need action.', attentionNew: 'New applications', attentionStale: 'Waiting over 48 hours', attentionInterviews: 'In interview stage', candidateFilterAll: 'All stages',
    publishRequirements: 'Add a location and a clear job description (at least 80 characters) before publishing. You can save a draft now.',
    privacyTitle: 'Application settings', privacyBody: 'Public application forms stay hidden until your privacy policy, company opt-in and security keys are configured.',
    privacyUrlLabel: 'Company privacy policy URL (HTTPS)', privacyEnable: 'Accept applications',
    privacyConfigured: 'Server security keys are configured', privacyNotConfigured: 'Public intake is not configured on the server. Applications will remain disabled.',
    privacySave: 'Save application settings', previewOnly: 'Security and opt-in are mandatory before receiving real candidate details.',
    switchLanguage: 'العربية'
  }
} as const

const pill = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60'
const field = 'w-full min-h-11 rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
const fieldLabel = 'mb-2 block text-sm font-medium text-foreground'

export function RecruitmentDashboard({
  workspaceSlug, data, systemRole
}: {
  workspaceSlug: string
  data: RecruitmentOverview
  systemRole?: string | null
}) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('ar')
  const t = words[lang]
  const [tab, setTab] = useState<Tab>('jobs')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [candidateStage, setCandidateStage] = useState('all')
  const [job, setJob] = useState<FormJob>(initialJob)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<FormCandidate>(initialCandidate)
  const [busy, setBusy] = useState(false)
  const [privacyUrl, setPrivacyUrl] = useState(data.settings.privacyPolicyUrl)
  const [acceptApplications, setAcceptApplications] = useState(data.settings.acceptApplications)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<Record<string, RecruitmentStageEvent[] | undefined>>({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const filteredJobs = useMemo(() => data.jobs.filter((item) =>
    (filter === 'all' || item.status === filter) &&
    [item.title, item.department, item.location].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [data.jobs, filter, search])
  const filteredApplications = useMemo(() => data.applications.filter((item) =>
    (candidateStage === 'all' || item.stage === candidateStage ||
      (candidateStage === 'stale' && item.stage === 'new' &&
        new Date(item.created_at).getTime() < Date.now() - 48 * 60 * 60 * 1000)) &&
    [item.full_name, item.phone, item.email, item.job_title].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [data.applications, search, candidateStage])

  async function act(action: () => Promise<unknown>, close = false) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await action()
      await router.invalidate()
      setHistoryItems({})
      setNotice(result && typeof result === 'object' && 'alreadyExists' in result &&
        result.alreadyExists === true ? t.alreadyExists : t.saved)
      if (close) {
        setDialog(null)
        setJob(initialJob)
        setEditingJobId(null)
        setCandidate(initialCandidate)
      }
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes('PUBLISH_DETAILS_REQUIRED')
        ? t.publishRequirements : t.failed)
    } finally {
      setBusy(false)
    }
  }

  async function toggleHistory(applicationId: string) {
    if (openHistoryId === applicationId) { setOpenHistoryId(null); return }
    setOpenHistoryId(applicationId)
    if (historyItems[applicationId] !== undefined) return
    setHistoryLoadingId(applicationId)
    try {
      const events = await loadRecruitmentApplicationHistoryServerFn({
        data: { workspaceSlug, applicationId }
      })
      setHistoryItems(previous => ({ ...previous, [applicationId]: events }))
    } catch {
      setError(lang === 'ar' ? 'تعذر عرض سجل المرشح.' : 'Could not load candidate history.')
    } finally { setHistoryLoadingId(null) }
  }

  function openDialog(type: Exclude<Dialog, null>) {
    setError('')
    if (type === 'job') { setEditingJobId(null); setJob(initialJob) }
    if (type === 'candidate') {
      setCandidate({ ...initialCandidate, jobId: data.jobs[0]?.id ?? '' })
    }
    setDialog(type)
  }

  function editJob(item: RecruitmentOverview['jobs'][number]) {
    setJob({ title: item.title, department: item.department, location: item.location,
      employmentType: item.employment_type, description: item.description })
    setEditingJobId(item.id)
    setError('')
    setDialog('job')
  }

  const summary = [
    { label: t.jobs, count: data.counts.jobs, icon: BriefcaseBusinessIcon },
    { label: t.published, count: data.counts.published, icon: CheckCircle2Icon },
    { label: t.candidatesTotal, count: data.counts.applications, icon: UsersRoundIcon },
    { label: t.inInterview, count: data.counts.interviewing, icon: Clock3Icon }
  ]

  return (
    <WorkspaceShell workspaceSlug={workspaceSlug} viewer={{ role: data.viewer.role as 'owner' | 'admin' | 'member' }} systemRole={systemRole} layout="wide">
      <section lang={lang === 'ar' ? 'ar-SA' : 'en'} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mx-auto max-w-7xl space-y-6 pb-14 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{t.eyebrow}</p>
          <button className={pill + ' min-h-9'} type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label="Change language">
            {t.switchLanguage}
          </button>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <SparklesIcon className="size-3.5" /> ATS / Recruitment
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{t.intro}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button type="button" className={pill + ' flex-1 sm:flex-none'} onClick={() => openDialog('candidate')} disabled={data.jobs.length === 0}>
              <UsersRoundIcon className="size-4" /> {t.addCandidate}
            </button>
            <button type="button" className={primary + ' flex-1 sm:flex-none'} onClick={() => openDialog('job')}>
              <CirclePlusIcon className="size-4" /> {t.newJob}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(({ label, count, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-4 flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs sm:text-sm">{label}</span>
                <Icon className="size-4" />
              </div>
              <p className="text-3xl font-bold tabular-nums">{count}</p>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="ats-attention-title">
          <div className="mb-4">
            <h2 id="ats-attention-title" className="text-lg font-semibold">{t.attentionTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.attentionIntro}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { label: t.attentionNew, count: data.counts.newApplications, stage: 'new' },
              { label: t.attentionStale, count: data.counts.staleApplications, stage: 'stale' },
              { label: t.attentionInterviews, count: data.counts.interviewing, stage: 'interview' }
            ]).map(item => (
              <button key={item.label} type="button" className="min-h-24 rounded-xl border border-border bg-background/60 p-4 text-start hover:border-primary/50"
                onClick={() => { setTab('candidates'); setCandidateStage(item.stage); setSearch('') }}>
                <span className="block text-sm text-muted-foreground">{item.label}</span>
                <span className="mt-2 block text-2xl font-bold tabular-nums">{item.count}</span>
              </button>
            ))}
          </div>
        </section>
        {(notice || error) && (
          <div role={error ? 'alert' : 'status'} className={'flex items-center justify-between rounded-xl border px-4 py-3 text-sm ' + (error ? 'border-destructive/50 text-destructive' : 'border-primary/40 text-foreground')}>
            <span>{error || notice}</span>
            <button type="button" onClick={() => { setNotice(''); setError('') }} aria-label="Dismiss"><XIcon className="size-4"/></button>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div role="tablist" aria-label="Recruitment sections" className="flex rounded-xl bg-muted p-1">
              <button role="tab" type="button" aria-selected={tab === 'jobs'} className={'rounded-lg px-4 py-2 text-sm font-medium ' + (tab === 'jobs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} onClick={() => { setTab('jobs'); setSearch('') }}>{t.jobs}</button>
              <button role="tab" type="button" aria-selected={tab === 'candidates'} className={'rounded-lg px-4 py-2 text-sm font-medium ' + (tab === 'candidates' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} onClick={() => { setTab('candidates'); setSearch('') }}>{t.applicants}</button>
            </div>
            <label className="relative w-full sm:w-72">
              <SearchIcon aria-hidden className="absolute top-3.5 start-3 size-4 text-muted-foreground"/>
              <span className="sr-only">{t.search}</span>
              <input className={field + ' ps-10'} value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
            </label>
          </div>
          {tab === 'jobs' ? (
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {(['all','published','draft','closed'] as const).map(status => (
                  <button key={status} type="button" onClick={() => setFilter(status)}
                    aria-pressed={filter === status}
                    className={'rounded-full border px-3 py-1.5 text-xs font-medium ' + (filter === status ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {status === 'all' ? t.all : status === 'published' ? t.live : status === 'draft' ? t.draft : t.closed}
                  </button>
                ))}
              </div>
              {filteredJobs.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredJobs.map(item => (
                    <article key={item.id} className="group rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">{item.title}</h2>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {item.department && <span>{item.department}</span>}
                            {item.location && <span className="inline-flex items-center gap-1"><MapPinIcon className="size-3.5"/>{item.location}</span>}
                          </div>
                        </div>
                        <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ' +
                          (item.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground')}>
                          {item.status === 'published' ? t.live : item.status === 'draft' ? t.draft : t.closed}
                        </span>
                      </div>
                      {item.description && <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">{item.application_count} {t.apply}</span>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy} className={pill + ' min-h-9 px-3 text-xs'}
                            onClick={() => editJob(item)}>{t.editJob}</button>
                          {item.status === 'published' && <a target="_blank" rel="noopener noreferrer"
                            href={`/careers/${encodeURIComponent(workspaceSlug)}#job-${encodeURIComponent(item.id)}`}
                            className={pill + ' min-h-9 px-3 text-xs'}>{t.viewPublic} <ArrowUpRightIcon className="size-3.5"/></a>}
                          {item.status !== 'closed' && (
                            <button type="button" disabled={busy} className={pill + ' min-h-9 px-3 text-xs'}
                              onClick={() => void act(() => updateRecruitmentJobStatusServerFn({ data: { workspaceSlug, jobId: item.id, status: item.status === 'published' ? 'draft' : 'published' } }))}>
                              {item.status === 'published' ? t.unpublish : t.publish}
                            </button>
                          )}
                          {item.status !== 'closed' && (
                            <button type="button" disabled={busy} className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => void act(() => updateRecruitmentJobStatusServerFn({ data: { workspaceSlug, jobId: item.id, status: 'closed' } }))}>{t.closeJob}</button>
                          )}
                          {item.status === 'closed' && <button type="button" disabled={busy} className={pill + ' min-h-9 text-xs'} onClick={() => void act(() => updateRecruitmentJobStatusServerFn({ data: { workspaceSlug, jobId: item.id, status: 'draft' } }))}>{t.draft}</button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState title={data.jobs.length === 0 ? t.emptyJobs : t.noMatches} description={data.jobs.length === 0 ? t.emptyJobsBody : ''} icon={BriefcaseBusinessIcon} action={data.jobs.length === 0 ? { label: t.newJob, onClick: () => openDialog('job') } : undefined} />}
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {(['all','new','stale','screening','shortlisted','interview','offer','hired'] as const).map(stage => (
                  <button key={stage} type="button" aria-pressed={candidateStage === stage}
                    onClick={() => setCandidateStage(stage)}
                    className={'rounded-full border px-3 py-1.5 text-xs font-medium ' +
                      (candidateStage === stage ? 'border-primary bg-primary/10 text-primary' :
                        'border-border text-muted-foreground hover:text-foreground')}>
                    {stage === 'all' ? t.candidateFilterAll : stage === 'stale' ? t.attentionStale : t[stage]}
                  </button>
                ))}
              </div>
              {filteredApplications.length ? (
                <div className="grid gap-3">
                  {filteredApplications.map(app => (
                    <article key={app.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">
                          {app.full_name.trim().slice(0,1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold">{app.full_name}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{app.job_title}</p>
                          <p dir="ltr" className="mt-1 text-start text-xs text-muted-foreground">{app.phone || app.email}</p>
                        </div>
                      </div>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        <label className="text-xs text-muted-foreground" htmlFor={'stage-' + app.id}>{t.stage}</label>
                        <select dir={lang === 'ar' ? 'rtl' : 'ltr'} id={'stage-' + app.id} disabled={busy} value={app.stage}
                          className={field + ' min-w-44 flex-1 sm:flex-none'} onChange={e => void act(() => moveRecruitmentApplicationServerFn({data: {workspaceSlug, applicationId: app.id, stage: e.target.value}}))}>
                          {stages.map(stage => <option value={stage} key={stage}>{t[stage]}</option>)}
                        </select>
                      </div>
                      <div className="w-full border-t border-border/60 pt-3">
                        <button type="button" className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                          aria-expanded={openHistoryId === app.id}
                          onClick={() => { void toggleHistory(app.id) }}>
                          {lang === 'ar' ? 'عرض سجل المراحل' : 'View stage history'}
                        </button>
                        {openHistoryId === app.id && (
                          <div className="mt-3 space-y-2 rounded-xl bg-muted/50 p-3 text-xs" role="region"
                            aria-label={lang === 'ar' ? 'سجل مراحل المرشح' : 'Candidate stage history'}>
                            {historyLoadingId === app.id ? (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') :
                              (historyItems[app.id]?.length ? historyItems[app.id]?.map(event => (
                                <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0">
                                  <span className="font-medium">
                                    {stages.includes(event.to_stage as typeof stages[number])
                                      ? t[event.to_stage as typeof stages[number]] : event.to_stage}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {event.changed_by_team ? (lang === 'ar' ? 'فريق التوظيف' : 'Recruitment team') :
                                      (lang === 'ar' ? 'نظام التقديم' : 'Application system')}
                                    {' · '}{new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at))}
                                  </span>
                                </div>
                              )) : (lang === 'ar' ? 'لا يوجد سجل سابق.' : 'No events recorded.'))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState title={data.applications.length === 0 ? t.emptyCandidates : t.noMatches} description={data.applications.length === 0 ? t.emptyCandidatesBody : ''} icon={FileUserIcon} action={data.applications.length === 0 && data.jobs.length ? { label: t.addCandidate, onClick: () => openDialog('candidate') } : undefined} />}
            </div>
          )}
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="apply-settings-title">
          <h2 id="apply-settings-title" className="text-lg font-semibold">{t.privacyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.privacyBody}</p>
          <form className="mt-5 space-y-4" onSubmit={e => {
            e.preventDefault()
            void act(() => saveRecruitmentApplicationSettingsServerFn({
              data: { workspaceSlug, privacyPolicyUrl: privacyUrl, acceptApplications }
            }))
          }}>
            <label className="block">
              <span className={fieldLabel}>{t.privacyUrlLabel}</span>
              <input className={field} type="url" required={acceptApplications}
                pattern="https://.*" autoComplete="url" maxLength={1000}
                placeholder="https://company.example/privacy"
                value={privacyUrl} onChange={e => setPrivacyUrl(e.target.value)} />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-primary"
                checked={acceptApplications}
                onChange={e => setAcceptApplications(e.target.checked)} />
              <span>{t.privacyEnable}</span>
            </label>
            <p role="status" className="text-xs text-muted-foreground">
              {data.settings.runtimeConfigured ? t.privacyConfigured : t.privacyNotConfigured}
            </p>
            <button type="submit" className={primary}
              disabled={busy || (acceptApplications && !privacyUrl.startsWith('https://'))}>
              {t.privacySave}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">{t.previewOnly}</p>
        </section>
        <p className="text-center text-xs text-muted-foreground">{t.warning}</p>
      </section>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setDialog(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="ats-dialog-title" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang === 'ar' ? 'ar-SA' : 'en'} className="my-auto w-full max-w-xl rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 id="ats-dialog-title" className="text-xl font-semibold">{dialog === 'job' ? (editingJobId ? t.editJob : t.quickJob) : t.quickCandidate}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{dialog === 'job' ? t.jobHint : t.candidateHint}</p>
              </div>
              <button type="button" aria-label="Close" className="rounded-lg p-2 hover:bg-muted" disabled={busy} onClick={() => setDialog(null)}><XIcon className="size-5"/></button>
            </div>
            {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
            {dialog === 'job' ? (
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); void act(() => editingJobId ? editRecruitmentJobServerFn({data: {workspaceSlug, jobId: editingJobId, ...job}}) : createRecruitmentJobServerFn({data: {workspaceSlug, ...job}}), true) }}>
                <label className="block"><span className={fieldLabel}>{t.jobTitle} *</span><input autoFocus required minLength={3} maxLength={150} className={field} value={job.title} onChange={e => setJob({...job, title: e.target.value})} placeholder={lang==='ar'?'مثال: أخصائي مبيعات عقارية':'e.g. Real Estate Sales Specialist'}/></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className={fieldLabel}>{t.department}</span><input maxLength={100} className={field} value={job.department} onChange={e=>setJob({...job,department:e.target.value})}/></label>
                  <label className="block"><span className={fieldLabel}>{t.location}</span><input maxLength={100} className={field} value={job.location} onChange={e=>setJob({...job,location:e.target.value})} placeholder={lang==='ar'?'جدة، السعودية':'Jeddah, Saudi Arabia'}/></label>
                </div>
                <label className="block"><span className={fieldLabel}>{t.employment}</span><select className={field} value={job.employmentType} onChange={e=>setJob({...job,employmentType:e.target.value})}><option value="full_time">{t.fullTime}</option><option value="part_time">{t.partTime}</option><option value="contract">{t.contract}</option><option value="internship">{t.internship}</option></select></label>
                <label className="block"><span className={fieldLabel}>{t.description}</span><textarea maxLength={10000} rows={4} className={field + ' resize-y py-3'} value={job.description} onChange={e=>setJob({...job,description:e.target.value})}/></label>
                <div className="flex justify-end gap-2 pt-3"><button type="button" className={pill} disabled={busy} onClick={()=>setDialog(null)}>{t.cancel}</button><button type="submit" className={primary} disabled={busy || !job.title.trim()}>{editingJobId ? t.saveChanges : t.saveJob} <ArrowUpRightIcon className="size-4"/></button></div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); void act(() => addRecruitmentCandidateServerFn({data:{workspaceSlug,...candidate}}),true) }}>
                <label className="block"><span className={fieldLabel}>{t.name} *</span><input required minLength={2} maxLength={150} autoFocus className={field} value={candidate.fullName} onChange={e=>setCandidate({...candidate,fullName:e.target.value})}/></label>
                <label className="block"><span className={fieldLabel}>{t.job} *</span><select required className={field} value={candidate.jobId} onChange={e=>setCandidate({...candidate,jobId:e.target.value})}><option value="">{t.chooseJob}</option>{data.jobs.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className={fieldLabel}>{t.phone}</span><input type="tel" dir="ltr" maxLength={40} className={field} value={candidate.phone} onChange={e=>setCandidate({...candidate,phone:e.target.value})} placeholder="+966 5..."/></label>
                  <label className="block"><span className={fieldLabel}>{t.email}</span><input type="email" dir="ltr" maxLength={250} className={field} value={candidate.email} onChange={e=>setCandidate({...candidate,email:e.target.value})} placeholder="name@example.com"/></label>
                </div>
                <div className="flex justify-end gap-2 pt-3"><button type="button" className={pill} disabled={busy} onClick={()=>setDialog(null)}>{t.cancel}</button><button type="submit" className={primary} disabled={busy || !candidate.fullName.trim() || !candidate.jobId || !(candidate.phone.trim() || candidate.email.trim())}>{t.saveCandidate} <ArrowUpRightIcon className="size-4"/></button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </WorkspaceShell>
  )
}

function EmptyState({ title, description, icon: Icon, action }: {
  title: string
  description: string
  icon: typeof BriefcaseBusinessIcon
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="rounded-2xl bg-muted p-4"><Icon className="size-7 text-muted-foreground"/></div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <button type="button" className={primary} onClick={action.onClick}><CirclePlusIcon className="size-4"/>{action.label}</button>}
    </div>
  )
}
