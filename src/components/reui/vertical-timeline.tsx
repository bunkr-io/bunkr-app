import { Bot } from 'lucide-react'
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '~/components/reui/timeline'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'

export interface TimelineEntry {
  id: string
  timestamp: number
  event: string
  actorType: 'user' | 'system'
  actorName?: string
  actorAvatarUrl?: string
  metadata: string
  resourceType?: string
}

// Human-readable action descriptions — written so they read naturally after
// the actor name, e.g. "Alice updated labels (2 labels)" or "Bunkr synced
// 15 new and 8 updated transactions from bank".
const EVENT_LABELS: Record<
  string,
  (metadata: Record<string, unknown>) => string
> = {
  'transaction.labels_updated': (m) =>
    `updated labels (${m.labelCount} label${m.labelCount !== 1 ? 's' : ''})`,
  'transaction.labels_batch_updated': (m) =>
    `updated labels on ${m.affectedCount} transaction${m.affectedCount !== 1 ? 's' : ''}`,
  'transaction.excluded_from_budget': () =>
    'excluded this transaction from budget',
  'transaction.included_in_budget': () => 'included this transaction in budget',
  'transaction.exclusion_batch_updated': (m) =>
    `updated budget exclusion on ${m.affectedCount} transaction${m.affectedCount !== 1 ? 's' : ''}`,
  'transaction.description_updated': () => 'updated the description',
  'transaction.description_batch_updated': (m) =>
    `updated description on ${m.affectedCount} transaction${m.affectedCount !== 1 ? 's' : ''}`,
  'transaction.category_updated': () => 'changed the category',
  'transaction.category_batch_updated': (m) =>
    `changed category on ${m.affectedCount} transaction${m.affectedCount !== 1 ? 's' : ''}`,
  'rule.created': (m) => `created rule "${m.pattern}"`,
  'rule.updated': (m) => `updated rule "${m.pattern}"`,
  'rule.toggled': (m) => (m.enabled ? 'enabled a rule' : 'disabled a rule'),
  'rule.deleted': (m) => `deleted rule "${m.pattern}"`,
  'rule.batch_deleted': (m) =>
    `deleted ${m.count} rule${m.count !== 1 ? 's' : ''}`,
  'rule.reordered': (m) =>
    `reordered ${m.count} rule${m.count !== 1 ? 's' : ''}`,
  'workspace.renamed': (m) => `renamed workspace to "${m.newName}"`,
  'workspace.member_invited': (m) => `invited ${m.invitedEmail}`,
  'workspace.member_removed': () => 'removed a member',
  'workspace.member_permissions_updated': () => 'updated member permissions',
  'workspace.invitation_revoked': (m) =>
    `revoked invitation for ${m.invitedEmail}`,
  'transaction.synced': (m) =>
    `synced ${m.created} new and ${m.updated} updated transaction${(m.created as number) + (m.updated as number) !== 1 ? 's' : ''} from bank`,
  'transaction.rule_applied': () => 'applied a rule to this transaction',
  'connection.synced': () => 'synced a bank connection',
  'connection.state_changed': (m) =>
    `changed connection state to ${m.newState}`,
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getDisplayName(entry: TimelineEntry): string {
  if (entry.actorType === 'system') return 'Bunkr'
  return entry.actorName ?? 'Someone'
}

function getEventLabel(event: string, metadata: string): string {
  try {
    const parsed = JSON.parse(metadata)
    const labelFn = EVENT_LABELS[event]
    if (labelFn) return labelFn(parsed)
  } catch {
    // Fall through to default
  }
  return event
}

export function AuditTimeline({
  entries,
  className,
}: {
  entries: TimelineEntry[]
  className?: string
}) {
  if (entries.length === 0) return null

  return (
    <Timeline defaultValue={entries.length} className={className}>
      {entries.map((entry, index) => (
        <TimelineItem
          key={entry.id}
          step={index + 1}
          className="group-data-[orientation=vertical]/timeline:ms-10"
        >
          <TimelineHeader>
            <TimelineSeparator className="bg-border! group-data-[orientation=vertical]/timeline:top-2 group-data-[orientation=vertical]/timeline:-left-8 group-data-[orientation=vertical]/timeline:h-[calc(100%-2.5rem)] group-data-[orientation=vertical]/timeline:translate-y-7" />
            <TimelineIndicator className="size-8 overflow-hidden rounded-full border-none group-data-[orientation=vertical]/timeline:-left-8">
              {entry.actorType === 'system' ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <Bot className="size-4 text-muted-foreground" />
                </div>
              ) : (
                <Avatar className="size-8">
                  {entry.actorAvatarUrl && (
                    <AvatarImage src={entry.actorAvatarUrl} />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(entry.actorName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </TimelineIndicator>
          </TimelineHeader>
          <TimelineContent>
            {(() => {
              const name = getDisplayName(entry)
              const label = getEventLabel(entry.event, entry.metadata)
              const isKnown = EVENT_LABELS[entry.event] !== undefined
              return isKnown ? (
                <p className="text-sm">
                  <span className="text-foreground font-medium">{name}</span>{' '}
                  <span className="text-muted-foreground">{label}</span>
                </p>
              ) : (
                <p className="text-sm">
                  <span className="text-foreground font-medium">{name}</span>{' '}
                  <Badge variant="outline" className="text-[10px]">
                    {label}
                  </Badge>
                </p>
              )
            })()}
            <TimelineDate className="mt-0.5 mb-0">
              {formatRelativeTime(entry.timestamp)}
            </TimelineDate>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  )
}
