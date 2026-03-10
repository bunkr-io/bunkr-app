import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId, requireAuthUserId } from './lib/auth'

export const list = query({
  args: { entityType: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member) return []

    return await ctx.db
      .query('filterViews')
      .withIndex('by_workspaceId_entityType', (q) =>
        q
          .eq('workspaceId', member.workspaceId)
          .eq('entityType', args.entityType),
      )
      .collect()
  },
})

export const create = mutation({
  args: {
    entityType: v.string(),
    name: v.string(),
    filters: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member) throw new Error('Not a workspace member')

    return await ctx.db.insert('filterViews', {
      workspaceId: member.workspaceId,
      entityType: args.entityType,
      name: args.name,
      filters: args.filters,
      createdBy: userId,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    viewId: v.id('filterViews'),
    name: v.optional(v.string()),
    filters: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member) throw new Error('Not a workspace member')

    const view = await ctx.db.get('filterViews', args.viewId)
    if (!view || view.workspaceId !== member.workspaceId) {
      throw new Error('View not found')
    }

    const patch: Record<string, string> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.filters !== undefined) patch.filters = args.filters

    await ctx.db.patch('filterViews', args.viewId, patch)
  },
})

export const remove = mutation({
  args: { viewId: v.id('filterViews') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const member = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!member) throw new Error('Not a workspace member')

    const view = await ctx.db.get('filterViews', args.viewId)
    if (!view || view.workspaceId !== member.workspaceId) {
      throw new Error('View not found')
    }

    await ctx.db.delete('filterViews', args.viewId)
  },
})
