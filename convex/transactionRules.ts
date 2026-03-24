import { v } from 'convex/values'
import { internalQuery, mutation, query } from './_generated/server'
import { getAuthUserId, requireAuthUserId } from './lib/auth'

export const listRules = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member) return []

    return await ctx.db
      .query('transactionRules')
      .withIndex('by_workspaceId', (q) =>
        q.eq('workspaceId', member.workspaceId),
      )
      .collect()
  },
})

export const createRule = mutation({
  args: {
    pattern: v.string(),
    matchType: v.union(v.literal('contains'), v.literal('regex')),
    categoryKey: v.optional(v.string()),
    excludeFromBudget: v.optional(v.boolean()),
    labelIds: v.optional(v.array(v.id('transactionLabels'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can create rules')
    }

    if (
      !args.categoryKey &&
      !args.excludeFromBudget &&
      (!args.labelIds || args.labelIds.length === 0)
    ) {
      throw new Error('At least one action is required')
    }

    return await ctx.db.insert('transactionRules', {
      workspaceId: member.workspaceId,
      pattern: args.pattern,
      matchType: args.matchType,
      categoryKey: args.categoryKey,
      excludeFromBudget: args.excludeFromBudget,
      labelIds: args.labelIds,
      createdBy: userId,
      createdAt: Date.now(),
    })
  },
})

export const updateRule = mutation({
  args: {
    ruleId: v.id('transactionRules'),
    pattern: v.optional(v.string()),
    matchType: v.optional(v.union(v.literal('contains'), v.literal('regex'))),
    categoryKey: v.optional(v.string()),
    excludeFromBudget: v.optional(v.boolean()),
    labelIds: v.optional(v.array(v.id('transactionLabels'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can update rules')
    }

    const rule = await ctx.db.get(args.ruleId)
    if (!rule || rule.workspaceId !== member.workspaceId) {
      throw new Error('Rule not found')
    }

    const patch: Record<string, string | boolean | Array<string> | undefined> =
      {}
    if (args.pattern !== undefined) patch.pattern = args.pattern
    if (args.matchType !== undefined) patch.matchType = args.matchType
    if (args.categoryKey !== undefined) patch.categoryKey = args.categoryKey
    if (args.excludeFromBudget !== undefined)
      patch.excludeFromBudget = args.excludeFromBudget
    if (args.labelIds !== undefined) patch.labelIds = args.labelIds

    await ctx.db.patch(args.ruleId, patch)
  },
})

export const deleteRule = mutation({
  args: { ruleId: v.id('transactionRules') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can delete rules')
    }

    const rule = await ctx.db.get(args.ruleId)
    if (!rule || rule.workspaceId !== member.workspaceId) {
      throw new Error('Rule not found')
    }

    await ctx.db.delete(args.ruleId)
  },
})

export const batchDeleteRules = mutation({
  args: { ruleIds: v.array(v.id('transactionRules')) },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can delete rules')
    }

    for (const ruleId of args.ruleIds) {
      const rule = await ctx.db.get(ruleId)
      if (rule && rule.workspaceId === member.workspaceId) {
        await ctx.db.delete(ruleId)
      }
    }
  },
})

// Internal helpers

export const listRulesForWorkspace = internalQuery({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('transactionRules')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()
  },
})
