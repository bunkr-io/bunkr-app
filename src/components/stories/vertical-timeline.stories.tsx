import type { Meta, StoryObj } from '@storybook/react'
import { AuditTimeline, type TimelineEntry } from '../reui/vertical-timeline'

const meta: Meta<typeof AuditTimeline> = {
  title: 'Data Display/AuditTimeline',
  component: AuditTimeline,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

const now = Date.now()
const oneHourAgo = now - 60 * 60 * 1000
const twoHoursAgo = now - 2 * 60 * 60 * 1000
const oneDayAgo = now - 24 * 60 * 60 * 1000

const mockEntries: TimelineEntry[] = [
  {
    id: '1',
    timestamp: now,
    event: 'transaction.labels_updated',
    actorType: 'user',
    actorName: 'Alice Johnson',
    actorAvatarUrl: undefined,
    metadata: JSON.stringify({
      transactionId: 'txn_1',
      previousLabelIds: [],
      newLabelIds: ['label1', 'label2'],
      labelCount: 2,
    }),
  },
  {
    id: '2',
    timestamp: oneHourAgo,
    event: 'transaction.category_updated',
    actorType: 'user',
    actorName: 'Bob Smith',
    actorAvatarUrl: undefined,
    metadata: JSON.stringify({
      transactionId: 'txn_1',
      categoryKey: 'groceries',
    }),
  },
  {
    id: '3',
    timestamp: twoHoursAgo,
    event: 'transaction.excluded_from_budget',
    actorType: 'user',
    actorName: 'Charlie Wilson',
    actorAvatarUrl: undefined,
    metadata: JSON.stringify({
      transactionId: 'txn_1',
      previousValue: false,
      newValue: true,
    }),
  },
  {
    id: '4',
    timestamp: oneDayAgo,
    event: 'transaction.synced',
    actorType: 'system',
    actorName: 'System',
    metadata: JSON.stringify({
      bankAccountId: 'ba_1',
      portfolioId: 'p_1',
      created: 15,
      updated: 8,
    }),
  },
]

export const Default: Story = {
  args: {
    entries: mockEntries,
  },
}

export const UserActionsOnly: Story = {
  args: {
    entries: mockEntries.filter((e) => e.actorType === 'user'),
  },
}

export const SystemEventsOnly: Story = {
  args: {
    entries: mockEntries.filter((e) => e.actorType === 'system'),
  },
}

export const RuleEvents: Story = {
  args: {
    entries: [
      {
        id: '1',
        timestamp: now,
        event: 'rule.created',
        actorType: 'user',
        actorName: 'Alice Johnson',
        metadata: JSON.stringify({
          ruleId: 'rule_1',
          pattern: '*amazon*',
          matchType: 'contains',
          categoryKey: 'shopping',
        }),
      },
      {
        id: '2',
        timestamp: oneHourAgo,
        event: 'rule.toggled',
        actorType: 'user',
        actorName: 'Alice Johnson',
        metadata: JSON.stringify({
          ruleId: 'rule_1',
          enabled: false,
        }),
      },
      {
        id: '3',
        timestamp: twoHoursAgo,
        event: 'rule.updated',
        actorType: 'user',
        actorName: 'Alice Johnson',
        metadata: JSON.stringify({
          ruleId: 'rule_1',
          pattern: '*amazon*',
          changedFields: ['categoryKey', 'excludeFromBudget'],
        }),
      },
    ],
  },
}

export const WorkspaceEvents: Story = {
  args: {
    entries: [
      {
        id: '1',
        timestamp: now,
        event: 'workspace.renamed',
        actorType: 'user',
        actorName: 'Owner',
        metadata: JSON.stringify({
          previousName: 'My Workspace',
          newName: 'Personal Finance',
        }),
      },
      {
        id: '2',
        timestamp: oneHourAgo,
        event: 'workspace.member_invited',
        actorType: 'user',
        actorName: 'Owner',
        metadata: JSON.stringify({
          invitedEmail: 'alice@example.com',
        }),
      },
      {
        id: '3',
        timestamp: twoHoursAgo,
        event: 'workspace.member_permissions_updated',
        actorType: 'user',
        actorName: 'Owner',
        metadata: JSON.stringify({
          memberId: 'member_1',
          permissions: {
            canViewTeamDashboard: true,
            canViewMemberBreakdown: false,
          },
        }),
      },
    ],
  },
}

export const LongList: Story = {
  args: {
    entries: Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      timestamp: now - i * 2 * 60 * 60 * 1000,
      event: [
        'transaction.labels_updated',
        'transaction.category_updated',
        'rule.created',
      ][i % 3] as string,
      actorType: (i % 2 === 0 ? 'user' : 'system') as 'user' | 'system',
      actorName: i % 2 === 0 ? `User ${i}` : 'System',
      metadata: JSON.stringify({
        affectedCount: i + 1,
        pattern: `pattern_${i}`,
        labelCount: i + 1,
      }),
    })),
  },
}
