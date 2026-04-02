import { useBilling } from '~/contexts/billing-context'

export function RequireTeamPlan({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { subscription } = useBilling()

  if (subscription === undefined) return null
  if (subscription?.plan !== 'team') return fallback ?? null

  return children
}
