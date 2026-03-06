import { v } from 'convex/values'
import { mutation, query, internalQuery } from './_generated/server'
import { getAuthUserId, requireAuthUserId } from './lib/auth'

export const getEncryptionKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db
      .query('encryptionKeys')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
  },
})

export const storeEncryptionKey = mutation({
  args: {
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
    pbkdf2Salt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)

    const existing = await ctx.db
      .query('encryptionKeys')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (existing) {
      throw new Error('Encryption key already exists. Delete first to re-create.')
    }

    return await ctx.db.insert('encryptionKeys', {
      userId,
      publicKey: args.publicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
      pbkdf2Salt: args.pbkdf2Salt,
      version: 1,
      createdAt: Date.now(),
    })
  },
})

export const deleteEncryptionKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const existing = await ctx.db
      .query('encryptionKeys')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

export const getPublicKeyByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query('encryptionKeys')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()
    return key?.publicKey ?? null
  },
})

export const migrateBankAccount = mutation({
  args: {
    bankAccountId: v.id('bankAccounts'),
    encryptedData: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    await ctx.db.patch(args.bankAccountId, {
      encryptedData: args.encryptedData,
      balance: 0,
      number: undefined,
      iban: undefined,
    })
  },
})

export const migrateBalanceSnapshot = mutation({
  args: {
    snapshotId: v.id('balanceSnapshots'),
    encryptedData: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    await ctx.db.patch(args.snapshotId, {
      encryptedData: args.encryptedData,
      balance: 0,
    })
  },
})

export const migrateInvestment = mutation({
  args: {
    investmentId: v.id('investments'),
    encryptedData: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    await ctx.db.patch(args.investmentId, {
      encryptedData: args.encryptedData,
      label: 'Encrypted',
      description: undefined,
      quantity: 0,
      unitprice: 0,
      unitvalue: 0,
      valuation: 0,
      portfolioShare: undefined,
      diff: undefined,
      diffPercent: undefined,
    })
  },
})

export const decryptBankAccount = mutation({
  args: {
    bankAccountId: v.id('bankAccounts'),
    balance: v.number(),
    number: v.optional(v.string()),
    iban: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    await ctx.db.patch(args.bankAccountId, {
      balance: args.balance,
      number: args.number,
      iban: args.iban,
      encryptedData: undefined,
    })
  },
})

export const decryptBalanceSnapshot = mutation({
  args: {
    snapshotId: v.id('balanceSnapshots'),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    await ctx.db.patch(args.snapshotId, {
      balance: args.balance,
      encryptedData: undefined,
    })
  },
})

export const decryptInvestment = mutation({
  args: {
    investmentId: v.id('investments'),
    label: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    unitprice: v.number(),
    unitvalue: v.number(),
    valuation: v.number(),
    portfolioShare: v.optional(v.number()),
    diff: v.optional(v.number()),
    diffPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx)
    const { investmentId, ...fields } = args
    await ctx.db.patch(investmentId, {
      ...fields,
      encryptedData: undefined,
    })
  },
})

export const getPublicKeyForProfile = internalQuery({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId)
    if (!profile) return null
    const workspace = await ctx.db.get(profile.workspaceId)
    if (!workspace) return null
    const key = await ctx.db
      .query('encryptionKeys')
      .withIndex('by_userId', (q) => q.eq('userId', workspace.createdBy))
      .first()
    return key?.publicKey ?? null
  },
})
