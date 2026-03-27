import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalMutation, mutation, query } from './_generated/server'
import { insertAuditLogDirect } from './auditLog'
import { getActorInfo, getAuthUserId, requireAuthUserId } from './lib/auth'

export const getMyWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (!member) return null

    return await ctx.db.get('workspaces', member.workspaceId)
  },
})

export const updateWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireAuthUserId(ctx)

    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can update the workspace')
    }

    const trimmed = name.trim()
    if (!trimmed) throw new Error('Workspace name cannot be empty')

    const workspace = await ctx.db.get('workspaces', member.workspaceId)
    const previousName = workspace?.name ?? ''

    await ctx.db.patch('workspaces', member.workspaceId, { name: trimmed })

    const identity = await ctx.auth.getUserIdentity()
    await insertAuditLogDirect(ctx.db, {
      workspaceId: member.workspaceId,
      workspaceName: trimmed,
      actorType: 'user',
      ...getActorInfo(identity),
      event: 'workspace.renamed',
      resourceType: 'workspace',
      resourceId: member.workspaceId,
      metadata: JSON.stringify({
        previousName,
        newName: trimmed,
      }),
    })
  },
})

export const leaveWorkspace = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)

    const membership = await ctx.runQuery(
      internal.members.getMembershipByUserId,
      { userId },
    )
    if (!membership) throw new Error('Not a workspace member')
    if (membership.role === 'owner') {
      throw new Error(
        'Workspace owners cannot leave. Delete the workspace instead.',
      )
    }

    await ctx.runMutation(internal.members.deleteMember, {
      memberId: membership._id,
    })
  },
})

export const deleteWorkspace = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)

    const membership = await ctx.runQuery(
      internal.members.getMembershipByUserId,
      { userId },
    )
    if (!membership || membership.role !== 'owner') {
      throw new Error('Only workspace owners can delete the workspace')
    }

    await ctx.runMutation(internal.workspaces.deleteWorkspaceData, {
      workspaceId: membership.workspaceId,
    })
  },
})

export const deleteWorkspaceData = internalMutation({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    // Delete all portfolios and their dependent data
    const portfolios = await ctx.db
      .query('portfolios')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()

    for (const portfolio of portfolios) {
      // Transactions
      const transactions = await ctx.db
        .query('transactions')
        .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolio._id))
        .collect()
      for (const t of transactions) await ctx.db.delete('transactions', t._id)

      // Investments
      const investments = await ctx.db
        .query('investments')
        .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolio._id))
        .collect()
      for (const i of investments) await ctx.db.delete('investments', i._id)

      // Balance snapshots
      const snapshots = await ctx.db
        .query('balanceSnapshots')
        .withIndex('by_portfolioId_timestamp', (q) =>
          q.eq('portfolioId', portfolio._id),
        )
        .collect()
      for (const s of snapshots) await ctx.db.delete('balanceSnapshots', s._id)

      // Bank accounts
      const accounts = await ctx.db
        .query('bankAccounts')
        .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolio._id))
        .collect()
      for (const a of accounts) await ctx.db.delete('bankAccounts', a._id)

      // Connections
      const connections = await ctx.db
        .query('connections')
        .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolio._id))
        .collect()
      for (const c of connections) await ctx.db.delete('connections', c._id)

      await ctx.db.delete('portfolios', portfolio._id)
    }

    // Delete workspace-level data
    const categories = await ctx.db
      .query('transactionCategories')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const c of categories)
      await ctx.db.delete('transactionCategories', c._id)

    const rules = await ctx.db
      .query('transactionRules')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const r of rules) await ctx.db.delete(r._id)

    const labels = await ctx.db
      .query('transactionLabels')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const l of labels) await ctx.db.delete('transactionLabels', l._id)

    const filterViews = await ctx.db
      .query('filterViews')
      .withIndex('by_workspaceId_entityType', (q) =>
        q.eq('workspaceId', workspaceId),
      )
      .collect()
    for (const f of filterViews) await ctx.db.delete('filterViews', f._id)

    // Delete invitations
    const invitations = await ctx.db
      .query('workspaceInvitations')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const i of invitations)
      await ctx.db.delete('workspaceInvitations', i._id)

    // Delete encryption data
    const wsEncryption = await ctx.db
      .query('workspaceEncryption')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .first()
    if (wsEncryption)
      await ctx.db.delete('workspaceEncryption', wsEncryption._id)

    const keySlots = await ctx.db
      .query('workspaceKeySlots')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const k of keySlots) await ctx.db.delete('workspaceKeySlots', k._id)

    // Delete members and their encryption keys
    const members = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect()
    for (const m of members) {
      const personalKey = await ctx.db
        .query('encryptionKeys')
        .withIndex('by_userId', (q) => q.eq('userId', m.userId))
        .first()
      if (personalKey) await ctx.db.delete('encryptionKeys', personalKey._id)
      await ctx.db.delete('workspaceMembers', m._id)
    }

    // Delete workspace
    await ctx.db.delete('workspaces', workspaceId)
  },
})
