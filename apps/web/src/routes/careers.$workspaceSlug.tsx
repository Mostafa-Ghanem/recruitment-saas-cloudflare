import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BriefcaseBusinessIcon, MapPinIcon, ArrowUpRightIcon, Globe2Icon } from 'lucide-react'
import { publicCareersServerFn } from '@/lib/server/public-careers'

export const Route = createFileRoute('/careers/$workspaceSlug')({
  loader: ({ params }) => publicCareersServerFn({ data: { workspaceSlug: params.workspaceSlug } }),
  component: CareersRoute,
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.company ? `${loaderData.company} | Careers` : 'Careers' },
      { name: 'description', content: 'Open positions and career opportunities.' }
    ]
  })
})

function CareersRoute() {
  const data = Route.useLoaderData()
  const [locale, setLocale] = useState<'ar'|'en'>('ar')
  const ar = locale === 'ar'
  return (
    <main lang={ar ? 'ar-SA' : 'en'} dir={ar ? 'rtl' : 'ltr'} className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5"><BriefcaseBusinessIcon className="size-6 text-primary"/></div>
            <span className="text-base font-semibold">{data.company || (ar ? 'الوظائف' : 'Careers')}</span>
          </div>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm hover:bg-muted" type="button" onClick={() => setLocale(ar ? 'en' : 'ar')}>
            <Globe2Icon className="size-4"/>{ar ? 'English' : 'العربية'}
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:pt-20">
        <div className="mb-10 max-w-2xl">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {ar ? 'انضم لفريقنا' : 'Join our team'}
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {ar ? 'فرصتك الجديدة تبدأ هنا' : 'Your next opportunity starts here'}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            {ar ? 'اكتشف الوظائف المتاحة حاليًا وتعرّف على الفرص المناسبة لخبرتك.' : 'Explore open roles and discover opportunities that fit your experience.'}
          </p>
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{ar ? 'الوظائف المتاحة' : 'Open positions'}</h2>
          <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">{data.jobs.length}</span>
        </div>
        {data.jobs.length ? (
          <div className="grid gap-4">
            {data.jobs.map(job => (
              <article key={job.id} id={'job-' + job.id} className="scroll-mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <h3 className="text-xl font-semibold">{job.title}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {job.department && <span>{job.department}</span>}
                      {job.location && <span className="inline-flex items-center gap-1"><MapPinIcon className="size-4"/>{job.location}</span>}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                    {ar ? 'متاحة الآن' : 'Open'}
                  </span>
                </div>
                {job.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{job.description}</p>}
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  <ArrowUpRightIcon className="size-4" />
                  {ar ? 'التقديم الإلكتروني لهذه الوظيفة سيتم تفعيله قريبًا.' : 'Online applications for this role will open soon.'}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
            <BriefcaseBusinessIcon className="mb-3 size-9 text-muted-foreground"/>
            <h3 className="font-semibold">{ar ? 'لا توجد وظائف متاحة حاليًا' : 'No open positions right now'}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ar ? 'تابع الصفحة لمعرفة الفرص الجديدة.' : 'Check back for new opportunities.'}</p>
          </div>
        )}
      </div>
    </main>
  )
}
