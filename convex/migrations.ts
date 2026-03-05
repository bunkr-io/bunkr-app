import { internalMutation } from './_generated/server'

export const backfillBalanceSnapshots = internalMutation({
  handler: async (ctx) => {
    const bankAccounts = await ctx.db.query('bankAccounts').collect()
    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const timestamp = now.getTime()

    let count = 0
    for (const ba of bankAccounts) {
      const existing = await ctx.db
        .query('balanceSnapshots')
        .withIndex('by_bankAccountId_date', (q) =>
          q.eq('bankAccountId', ba._id).eq('date', date),
        )
        .first()

      if (!existing) {
        await ctx.db.insert('balanceSnapshots', {
          bankAccountId: ba._id,
          profileId: ba.profileId,
          balance: ba.balance,
          currency: ba.currency,
          date,
          timestamp,
        })
        count++
      }
    }
    return { backfilled: count }
  },
})

export const seedBalanceSnapshots = internalMutation({
  handler: async (ctx) => {
    const bankAccounts = await ctx.db.query('bankAccounts').collect()
    const now = new Date()
    const days = 90

    let count = 0
    for (const ba of bankAccounts) {
      for (let i = days; i >= 1; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const date = d.toISOString().slice(0, 10)
        const timestamp = d.getTime()

        // Random walk: drift +-2% from current balance
        const variation = 1 + (Math.random() - 0.5) * 0.04 * (i / days)
        const balance = Math.round(ba.balance * variation * 100) / 100

        await ctx.db.insert('balanceSnapshots', {
          bankAccountId: ba._id,
          profileId: ba.profileId,
          balance,
          currency: ba.currency,
          date,
          timestamp,
          seed: true,
        })
        count++
      }
    }
    return { seeded: count }
  },
})

export const deleteSeedSnapshots = internalMutation({
  handler: async (ctx) => {
    const all = await ctx.db.query('balanceSnapshots').collect()
    let count = 0
    for (const snap of all) {
      if (snap.seed) {
        await ctx.db.delete(snap._id)
        count++
      }
    }
    return { deleted: count }
  },
})
