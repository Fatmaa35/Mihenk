import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { json } from './queries'

/** Yönetim paneli uç noktaları. Yetki kontrolü sunucuda yapılır; arayüz yalnızca görünürlüğü ayarlar. */

export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  quality: ['admin', 'quality'] as const,
  metrics: ['admin', 'metrics'] as const,
  beta: ['admin', 'beta'] as const,
  funnel: ['admin', 'funnel'] as const,
  logs: ['admin', 'logs'] as const,
  users: (q: string) => ['admin', 'users', q] as const,
  reports: (status: string) => ['admin', 'reports', status] as const,
  jobs: ['admin', 'catalog-jobs'] as const,
  issues: ['admin', 'catalog-issues'] as const,
  runs: ['admin', 'pipeline-runs'] as const,
  pipelineLogs: (runId: string) => ['admin', 'pipeline-logs', runId] as const,
}

export type AdminDashboard = {
  users: number; verified_users: number; banned_users: number; comments: number; ratings: number; books: number; offers: number
  top_books: { id: string; title: string; author: string; rating_average: number; rating_count: number; popularity_score: number }[]
}
export type QualityDashboard = {
  books: number; recommendable_books: number; low_quality_books: number; duplicate_work_groups: number; editions: number
  verified_turkish_editions: number; priced_books: number; offers: number; last_price_check: string | null; missing_covers: number
  suspicious_records: number; zero_result_queries: number; fallback_rate: number; average_latency_ms: number; feedback: Record<string, number>
}
export type RouteMetric = { requests: number; errors: number; p50_ms: number; p95_ms: number; p99_ms: number }
export type AdminMetrics = {
  routes: Record<string, RouteMetric>
  business?: Record<string, number>
  alerts: { severity: 'warning' | 'critical'; code: string; message: string }[]
  product: { zero_result_queries: number; gemma_fallback_rate: number; catalog_books: number }
}
export type BetaDashboard = {
  days: number; active_users: number; onboarding_completed: number; feedback_count: number; average_rating: number | null
  events: Record<string, number>
  recent_feedback: { id?: string; category: string; rating: number | null; message: string; created_at: string; display_name?: string }[]
}
export type Funnel = { days: number; variants: Record<string, { counts: Record<string, number>; click_through_rate: number; library_add_rate: number; reading_start_rate: number; reading_finish_rate: number; positive_feedback_rate: number }> }
export type LogEntry = { level: string; event_type: string; request_id?: string; method?: string; route?: string; status_code?: number; duration_ms?: number; created_at?: string; message?: string }
export type AdminUser = {
  id: string; display_name: string; email: string | null; app_role: string; is_verified: boolean; verification_label: string | null
  banned_until: string | null; ban_reason: string | null; created_at: string; comment_count: number; rating_count: number; is_banned: boolean
}
export type CommentReport = {
  id: number; comment_id: string; reason: string; details: string | null; status: string; created_at: string
  content: string; book_id: string; reporter_name: string
}
export type CatalogJob = { id: string; job_type: string; status: string; attempts: number; max_attempts: number; last_error: string | null; created_at: string; finished_at: string | null; payload?: Record<string, unknown> }
export type CatalogIssue = { id: string; book_id: string; issue_type: string; severity: string; status: string; title: string; author: string; quality_score: number; created_at: string }
export type PipelineRun = { id: string; job_type: string; orchestrator: string; trigger_kind: string; status: string; checked_count: number; success_count: number; failure_count: number; started_at: string; finished_at: string | null }
export type PipelineLog = { id: string; run_id: string; level: string; stage: string; message: string; created_at: string }
export type EvaluationReport = {
  summary: Record<string, number>
  results: { id: string; query: string; titles: string[]; passed: boolean; constraint_violations: string[] }[]
}

const get = <T,>(path: string) => () => api<T>(path)

export const useAdminDashboard = () => useQuery({ queryKey: adminKeys.dashboard, queryFn: get<AdminDashboard>('/admin/dashboard') })
export const useQualityDashboard = () => useQuery({ queryKey: adminKeys.quality, queryFn: get<QualityDashboard>('/admin/quality') })
export const useAdminMetrics = () => useQuery({ queryKey: adminKeys.metrics, queryFn: get<AdminMetrics>('/admin/metrics') })
export const useBetaDashboard = () => useQuery({ queryKey: adminKeys.beta, queryFn: get<BetaDashboard>('/admin/beta-dashboard?days=30') })
export const useRecommendationFunnel = () => useQuery({ queryKey: adminKeys.funnel, queryFn: get<Funnel>('/admin/recommendation-funnel') })
export const useSystemLogs = () => useQuery({ queryKey: adminKeys.logs, queryFn: get<LogEntry[]>('/admin/logs?limit=40') })

export function useAdminUsers(q: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  return useQuery({ queryKey: adminKeys.users(q), queryFn: get<AdminUser[]>(`/admin/users${params.size ? `?${params}` : ''}`), placeholderData: (previous) => previous })
}

function useAdminMutation<Input>(request: (input: Input) => Promise<unknown>, invalidate: readonly (readonly string[])[]) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey }))),
  })
}

export const useVerifyUser = () => useAdminMutation(
  (input: { id: string; verified: boolean; label: string | null }) =>
    api(`/admin/users/${input.id}/verification`, { method: 'PATCH', ...json({ verified: input.verified, label: input.label }) }),
  [['admin', 'users'], adminKeys.dashboard],
)
export const useBanUser = () => useAdminMutation(
  (input: { id: string; banned: boolean; reason: string | null; duration_days: number | null }) =>
    api(`/admin/users/${input.id}/ban`, { method: 'PATCH', ...json({ banned: input.banned, reason: input.reason, duration_days: input.duration_days }) }),
  [['admin', 'users'], adminKeys.dashboard],
)
export const useSetUserRole = () => useAdminMutation(
  (input: { id: string; role: 'user' | 'editor' | 'admin' }) => api(`/admin/users/${input.id}/role`, { method: 'PUT', ...json({ role: input.role }) }),
  [['admin', 'users']],
)
export const useInviteUser = () => useMutation({
  mutationFn: (input: { display_name: string; email: string }) => api<{ message: string }>('/admin/invitations', { method: 'POST', ...json(input) }),
})

export const useCommentReports = (status: string) =>
  useQuery({ queryKey: adminKeys.reports(status), queryFn: get<CommentReport[]>(`/admin/community/reports${status ? `?status=${status}` : ''}`) })
export const useResolveReport = () => useAdminMutation(
  (input: { id: number; status: 'reviewing' | 'resolved' | 'dismissed'; comment_status: 'published' | 'hidden' | 'removed' | null }) =>
    api(`/admin/community/reports/${input.id}`, { method: 'PATCH', ...json({ status: input.status, comment_status: input.comment_status }) }),
  [['admin', 'reports'], adminKeys.dashboard],
)

export const useCatalogJobs = () => useQuery({ queryKey: adminKeys.jobs, queryFn: get<CatalogJob[]>('/admin/catalog/jobs') })
export const useCatalogIssues = () => useQuery({ queryKey: adminKeys.issues, queryFn: get<CatalogIssue[]>('/admin/catalog/issues') })
export const useCreateCatalogJob = () => useAdminMutation(
  (input: { job_type: string; query: string | null; limit: number }) => api('/admin/catalog/jobs', { method: 'POST', ...json(input) }),
  [adminKeys.jobs],
)
export const useResolveIssue = () => useAdminMutation(
  (input: { id: string; status: 'resolved' | 'dismissed' }) => api(`/admin/catalog/issues/${input.id}`, { method: 'PATCH', ...json({ status: input.status }) }),
  [adminKeys.issues, adminKeys.quality],
)

export const usePipelineRuns = () => useQuery({ queryKey: adminKeys.runs, queryFn: get<PipelineRun[]>('/admin/pipelines/runs?limit=20') })
export const usePipelineLogs = (runId: string) =>
  useQuery({ queryKey: adminKeys.pipelineLogs(runId), queryFn: get<PipelineLog[]>(`/admin/pipelines/logs?limit=60${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`) })
export const useRunPricePipeline = () => useAdminMutation(
  () => api('/admin/pipelines/prices', { method: 'POST', ...json({ idempotency_key: `admin-${crypto.randomUUID()}`, limit: 20, discover_books: 10 }) }),
  [adminKeys.runs],
)

export const useRunEvaluation = () => useMutation({ mutationFn: () => api<EvaluationReport>('/admin/evaluations/recommendations', { method: 'POST' }) })
