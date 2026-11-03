import { createFileRoute } from '@tanstack/react-router'
import { pageQueryOptions } from '@/lib/page-query'
import { RoutePending } from '@/components/route-pending'
import { RecruitmentDashboard } from '@/components/recruitment/recruitment-dashboard'
import { loadRecruitmentServerFn } from '@/lib/server/recruitment'
import { useSuspenseQuery } from '@tanstack/react-query'

function recruitmentQuery(actorId: string, workspaceSlug: string) {
  return pageQueryOptions(['recruitment', actorId, workspaceSlug], () =>
    loadRecruitmentServerFn({ data: { workspaceSlug } })
  )
}

export const Route = createFileRoute('/workspaces/$workspaceSlug/recruitment')({
  loader: ({ params, context }) => context.queryClient.query({
    ...recruitmentQuery(context.session.user.id, params.workspaceSlug),
    staleTime: 0
  }),
  pendingComponent: RoutePending,
  component: RecruitmentRoute,
  head: () => ({ meta: [{ title: 'Recruitment | ATS' }] })
})

function RecruitmentRoute() {
  const { workspaceSlug } = Route.useParams()
  const session = Route.useRouteContext().session
  const { data } = useSuspenseQuery(recruitmentQuery(session.user.id,workspaceSlug))
  return <RecruitmentDashboard workspaceSlug={workspaceSlug} data={data} systemRole={session.user.role}/>
}
