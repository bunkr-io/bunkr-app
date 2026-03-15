import { query } from './_generated/server'
import { getAuthUserId } from './lib/auth'

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
