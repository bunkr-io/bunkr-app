import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { getAuthUserId } from './lib/auth'
import { requireTeamPlan } from './lib/billing'

interface TeamContext {
  membership: Doc<'workspaceMembers'>
  sharedPortfolios: Array<Doc<'portfolios'>>
}

async function getTeamContext(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
): Promise<TeamContext> {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Unauthenticated')

  const membership = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first()

  if (!membership || membership.workspaceId !== workspaceId) {
    throw new Error('Not a member of this workspace')
  }

  // Check permission (owner always has access, undefined = default open)
  if (membership.role !== 'owner') {
    const perms = membership.permissions
    if (perms && !perms.canViewTeamDashboard) {
      throw new Error('No permission to view team dashboard')
    }
  }

  await requireTeamPlan(ctx, workspaceId)

  // Get all shared portfolios in the workspace
  const allPortfolios = await ctx.db
    .query('portfolios')
    .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
    .collect()

  const sharedPortfolios = allPortfolios.filter((p) => p.shared === true)

  return { membership, sharedPortfolios }
}

export const listSharedPortfolios = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const { sharedPortfolios } = await getTeamContext(ctx, args.workspaceId)

    const memberIds = [
      ...new Set(sharedPortfolios.map((p) => p.memberId)),
    ] as Array<Id<'workspaceMembers'>>
    const members = await Promise.all(memberIds.map((id) => ctx.db.get(id)))
    const memberMap = new Map(
      members
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => [m._id, m]),
    )

    return sharedPortfolios.map((p) => ({
      _id: p._id,
      name: p.name,
      icon: p.icon,
      memberId: p.memberId,
      memberUserId: memberMap.get(p.memberId)?.userId ?? null,
      shareAmounts: p.shareAmounts ?? true,
    }))
  },
})

export const listTeamBankAccounts = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const { sharedPortfolios } = await getTeamContext(ctx, args.workspaceId)

    const portfolioIds = sharedPortfolios.map((p) => p._id)
    const shareAmountsMap = new Map(
      sharedPortfolios.map((p) => [p._id as string, p.shareAmounts ?? true]),
    )

    const allAccounts = await Promise.all(
      portfolioIds.map((portfolioId) =>
        ctx.db
          .query('bankAccounts')
          .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolioId))
          .collect(),
      ),
    )
    const accounts = allAccounts.flat()

    const connectionIds = [
      ...new Set(accounts.map((a) => a.connectionId)),
    ] as Array<Id<'connections'>>
    const connections = await Promise.all(
      connectionIds.map((id) => ctx.db.get(id)),
    )
    const connMap = new Map(
      connections
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c._id, c]),
    )

    return accounts.map((a) => {
      const conn = connMap.get(a.connectionId)
      const showAmounts = shareAmountsMap.get(a.portfolioId as string)
      return {
        ...a,
        connectionEncryptedData: conn?.encryptedData ?? undefined,
        encryptedBalance: showAmounts ? a.encryptedBalance : undefined,
      }
    })
  },
})

export const listTeamBalanceSnapshots = query({
  args: {
    workspaceId: v.id('workspaces'),
    startTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const { sharedPortfolios } = await getTeamContext(ctx, args.workspaceId)

    const shareAmountsMap = new Map(
      sharedPortfolios.map((p) => [p._id as string, p.shareAmounts ?? true]),
    )

    const results = await Promise.all(
      sharedPortfolios.map((p) =>
        ctx.db
          .query('balanceSnapshots')
          .withIndex('by_portfolioId_timestamp', (q) =>
            q.eq('portfolioId', p._id).gte('timestamp', args.startTimestamp),
          )
          .collect(),
      ),
    )

    return results.flat().map((s) => ({
      ...s,
      encryptedData: shareAmountsMap.get(s.portfolioId as string)
        ? s.encryptedData
        : '',
    }))
  },
})

export const listTeamInvestments = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const { sharedPortfolios } = await getTeamContext(ctx, args.workspaceId)

    const portfolioIds = sharedPortfolios.map((p) => p._id)
    const shareAmountsMap = new Map(
      sharedPortfolios.map((p) => [p._id as string, p.shareAmounts ?? true]),
    )

    const results = await Promise.all(
      portfolioIds.map((portfolioId) =>
        ctx.db
          .query('investments')
          .withIndex('by_portfolioId', (q) => q.eq('portfolioId', portfolioId))
          .collect(),
      ),
    )

    return results
      .flat()
      .filter((inv) => !inv.deleted)
      .map((inv) => {
        const showAmounts = shareAmountsMap.get(inv.portfolioId as string)
        return {
          ...inv,
          encryptedValuation: showAmounts ? inv.encryptedValuation : undefined,
        }
      })
  },
})

export const listTeamTransactions = query({
  args: {
    workspaceId: v.id('workspaces'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { sharedPortfolios } = await getTeamContext(ctx, args.workspaceId)

    const portfolioIds = sharedPortfolios.map((p) => p._id)
    const shareAmountsMap = new Map(
      sharedPortfolios.map((p) => [p._id as string, p.shareAmounts ?? true]),
    )

    const results = await Promise.all(
      portfolioIds.map((portfolioId) =>
        ctx.db
          .query('transactions')
          .withIndex('by_portfolioId_date', (q) =>
            q
              .eq('portfolioId', portfolioId)
              .gte('date', args.startDate)
              .lte('date', args.endDate),
          )
          .collect(),
      ),
    )

    return results
      .flat()
      .filter((t) => !t.deleted)
      .map((t) => {
        const showAmounts = shareAmountsMap.get(t.portfolioId as string)
        return {
          ...t,
          encryptedFinancials: showAmounts ? t.encryptedFinancials : undefined,
        }
      })
  },
})

export const getTeamMemberBreakdown = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const { membership, sharedPortfolios } = await getTeamContext(
      ctx,
      args.workspaceId,
    )

    // Check member breakdown permission
    if (membership.role !== 'owner') {
      const perms = membership.permissions
      if (perms && !perms.canViewMemberBreakdown) {
        throw new Error('No permission to view member breakdown')
      }
    }

    // Return portfolio metadata — client computes balances from decrypted bank accounts
    return sharedPortfolios.map((p) => ({
      portfolioId: p._id as string,
      memberId: p.memberId as string,
      shareAmounts: p.shareAmounts ?? true,
    }))
  },
})
