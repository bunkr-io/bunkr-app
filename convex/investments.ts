import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserId } from './lib/auth'

export const listInvestments = query({
  args: { bankAccountId: v.id('bankAccounts') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    return (
      await ctx.db
        .query('investments')
        .withIndex('by_bankAccountId', (q) =>
          q.eq('bankAccountId', args.bankAccountId),
        )
        .collect()
    ).filter((inv) => !inv.deleted)
  },
})

export const listInvestmentsByProfile = query({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    return (
      await ctx.db
        .query('investments')
        .withIndex('by_profileId', (q) => q.eq('profileId', args.profileId))
        .collect()
    ).filter((inv) => !inv.deleted)
  },
})

export const listAllInvestmentsByProfiles = query({
  args: { profileIds: v.array(v.id('profiles')) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const results = await Promise.all(
      args.profileIds.map((profileId) =>
        ctx.db
          .query('investments')
          .withIndex('by_profileId', (q) => q.eq('profileId', profileId))
          .collect(),
      ),
    )
    return results.flat().filter((inv) => !inv.deleted)
  },
})
