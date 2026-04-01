import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInWeeks,
  isToday,
  isYesterday,
} from 'date-fns'

export type DateGroup =
  | 'Today'
  | 'Yesterday'
  | 'Last week'
  | 'Last month'
  | 'Older'

const GROUP_ORDER: DateGroup[] = [
  'Today',
  'Yesterday',
  'Last week',
  'Last month',
  'Older',
]

function getDateGroup(date: Date): DateGroup {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  const days = differenceInDays(new Date(), date)
  if (days <= 7) return 'Last week'
  if (days <= 30) return 'Last month'
  return 'Older'
}

export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date,
): Array<{ group: DateGroup; items: T[] }> {
  const groups = new Map<DateGroup, T[]>()

  for (const item of items) {
    const group = getDateGroup(getDate(item))
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)?.push(item)
  }

  return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({
    group: g,
    items: groups.get(g)!,
  }))
}

export function formatRelativeShort(date: Date): string {
  const now = new Date()
  const mins = differenceInMinutes(now, date)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = differenceInHours(now, date)
  if (hours < 24) return `${hours}h`
  const days = differenceInDays(now, date)
  if (days < 7) return `${days}d`
  const weeks = differenceInWeeks(now, date)
  if (weeks < 5) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}
