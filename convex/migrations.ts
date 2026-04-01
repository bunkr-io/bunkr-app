import { internalMutation } from './_generated/server'

export const backfillBalanceSnapshots = internalMutation({
  args: {},
  handler: async (_ctx) => {
    // Balance is now encrypted on bankAccounts — backfill from plaintext is no longer possible.
    // Balance snapshots must be created during sync with encrypted data.
    return { backfilled: 0 }
  },
})

export const seedBalanceSnapshots = internalMutation({
  args: {},
  handler: async (_ctx) => {
    // Balance is now encrypted on bankAccounts — seeding from plaintext is no longer possible.
    // Seed data is not compatible with mandatory encryption.
    return { seeded: 0 }
  },
})

export const deleteSeedSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('balanceSnapshots').collect()
    const toDelete = all.filter((snap) => snap.seed)
    await Promise.all(
      toDelete.map((snap) => ctx.db.delete('balanceSnapshots', snap._id)),
    )
    return { deleted: toDelete.length }
  },
})

// One-time script: delete all pending transactions (coming=true).
// We no longer sync pending transactions from Powens, so these are stale.
export const deleteAllPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('transactions').collect()
    const pending = all.filter((t) => t.coming)

    for (const t of pending) {
      await ctx.db.delete('transactions', t._id)
    }

    return { deleted: pending.length }
  },
})
