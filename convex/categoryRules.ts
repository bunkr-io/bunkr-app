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
      .query('categoryRules')
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
    categoryKey: v.string(),
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

    return await ctx.db.insert('categoryRules', {
      workspaceId: member.workspaceId,
      pattern: args.pattern,
      matchType: args.matchType,
      categoryKey: args.categoryKey,
      createdBy: userId,
      createdAt: Date.now(),
    })
  },
})

export const updateRule = mutation({
  args: {
    ruleId: v.id('categoryRules'),
    pattern: v.optional(v.string()),
    matchType: v.optional(v.union(v.literal('contains'), v.literal('regex'))),
    categoryKey: v.optional(v.string()),
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

    const rule = await ctx.db.get('categoryRules', args.ruleId)
    if (!rule || rule.workspaceId !== member.workspaceId) {
      throw new Error('Rule not found')
    }

    const patch: Record<string, string> = {}
    if (args.pattern !== undefined) patch.pattern = args.pattern
    if (args.matchType !== undefined) patch.matchType = args.matchType
    if (args.categoryKey !== undefined) patch.categoryKey = args.categoryKey

    await ctx.db.patch('categoryRules', args.ruleId, patch)
  },
})

export const deleteRule = mutation({
  args: { ruleId: v.id('categoryRules') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member || member.role !== 'owner') {
      throw new Error('Only workspace owners can delete rules')
    }

    const rule = await ctx.db.get('categoryRules', args.ruleId)
    if (!rule || rule.workspaceId !== member.workspaceId) {
      throw new Error('Rule not found')
    }

    await ctx.db.delete('categoryRules', args.ruleId)
  },
})

// Internal helpers

export const getRuleInternal = internalQuery({
  args: { ruleId: v.id('categoryRules') },
  handler: async (ctx, args) => {
    return await ctx.db.get('categoryRules', args.ruleId)
  },
})

export const getWorkspacePortfolios = internalQuery({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('portfolios')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()
  },
})

export const listRulesForWorkspace = internalQuery({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('categoryRules')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()
  },
})
