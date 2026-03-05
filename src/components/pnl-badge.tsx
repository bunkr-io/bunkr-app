import { TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import type { PnL } from '~/lib/pnl'

interface PnLBadgeProps {
  pnl: PnL | null
  currency: string
}

export function PnLBadge({ pnl, currency }: PnLBadgeProps) {
  if (!pnl) return null

  const Icon = pnl.isPositive ? TrendingUp : TrendingDown
  const sign = pnl.isPositive ? '+' : ''

  const formattedAbsolute = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    signDisplay: 'never',
  }).format(Math.abs(pnl.absolute))

  const formattedPercentage = `${sign}${pnl.percentage.toFixed(1)}%`

  return (
    <Badge
      variant="outline"
      className={
        pnl.isPositive
          ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'
          : 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'
      }
    >
      <Icon className="size-3" />
      {sign}{formattedAbsolute} ({formattedPercentage})
    </Badge>
  )
}
