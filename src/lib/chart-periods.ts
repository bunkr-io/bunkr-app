export type Period = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'All'

export const PERIODS: Array<Period> = ['1W', '1M', '3M', 'YTD', '1Y', 'All']

export function getStartTimestamp(period: Period): number {
  if (period === 'All') return 0

  const now = new Date()

  switch (period) {
    case '1W':
      return now.getTime() - 7 * 24 * 60 * 60 * 1000
    case '1M':
      return new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
      ).getTime()
    case '3M':
      return new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate(),
      ).getTime()
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1).getTime()
    case '1Y':
      return new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      ).getTime()
  }
}
