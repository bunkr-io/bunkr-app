import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { internal } from './_generated/api'
import { buildEncryptionFieldGroups } from './powens'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

function makeTxn(
  overrides: Partial<Parameters<typeof buildEncryptionFieldGroups>[0]> = {},
) {
  return {
    powensTransactionId: 1,
    date: '2026-01-15',
    rdate: undefined,
    vdate: undefined,
    value: 100,
    originalValue: undefined,
    originalCurrency: undefined,
    type: 'transfer',
    wording: 'VIREMENT SEPA',
    originalWording: undefined,
    simplifiedWording: undefined,
    category: 'Leisure',
    categoryParent: undefined,
    coming: false,
    active: true,
    deleted: false,
    counterparty: undefined,
    card: undefined,
    comment: undefined,
    ...overrides,
  }
}

async function seedTestData(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert('workspaces', {
      name: 'Test Workspace',
      createdBy: 'user_test',
    })
    const memberId = await ctx.db.insert('workspaceMembers', {
      workspaceId,
      userId: 'user_test',
      role: 'owner',
    })
    const portfolioId = await ctx.db.insert('portfolios', {
      workspaceId,
      memberId,
      name: 'Main',
    })
    const connectionId = await ctx.db.insert('connections', {
      portfolioId,
      powensConnectionId: 1,
      encryptedData: '',
    })
    const bankAccountId = await ctx.db.insert('bankAccounts', {
      connectionId,
      portfolioId,
      powensBankAccountId: 1,
      currency: 'EUR',
      disabled: false,
      deleted: false,
      encryptedIdentity: '',
      encryptedBalance: '',
    })
    return { workspaceId, portfolioId, bankAccountId }
  })
}

describe('buildEncryptionFieldGroups', () => {
  it('returns all fields for new transactions', () => {
    const txn = makeTxn({
      userCategoryKey: undefined,
      customDescription: undefined,
    })
    const result = buildEncryptionFieldGroups(txn, true, new Set())

    expect(result.allFields).toBe(true)
    expect(result.groups).toHaveProperty('encryptedDetails')
    expect(result.groups).toHaveProperty('encryptedFinancials')
    expect(result.groups).toHaveProperty('encryptedCategories')
  })

  it('returns only financials for existing transactions without rule match', () => {
    const txn = makeTxn()
    const result = buildEncryptionFieldGroups(txn, false, new Set())

    expect(result.allFields).toBe(false)
    expect(result.groups).not.toHaveProperty('encryptedDetails')
    expect(result.groups).toHaveProperty('encryptedFinancials')
    expect(result.groups).not.toHaveProperty('encryptedCategories')
  })

  it('returns all fields for existing transactions with rule match', () => {
    const txn = makeTxn({
      powensTransactionId: 42,
      userCategoryKey: 'custom-cat',
      customDescription: 'Custom desc',
    })
    const ruleMatchedIds = new Set([42])
    const result = buildEncryptionFieldGroups(txn, false, ruleMatchedIds)

    expect(result.allFields).toBe(true)
    expect(result.groups).toHaveProperty('encryptedDetails')
    expect(result.groups).toHaveProperty('encryptedCategories')
    const groups = result.groups as Record<string, Record<string, unknown>>
    expect(groups.encryptedCategories.userCategoryKey).toBe('custom-cat')
    expect(groups.encryptedDetails.customDescription).toBe('Custom desc')
  })

  it('includes correct financial values regardless of path', () => {
    const txn = makeTxn({ value: 250.5, originalValue: 300 })

    const newResult = buildEncryptionFieldGroups(txn, true, new Set())
    const existingResult = buildEncryptionFieldGroups(txn, false, new Set())

    const newFinancials = (
      newResult.groups as Record<string, Record<string, unknown>>
    ).encryptedFinancials
    const existingFinancials = (
      existingResult.groups as Record<string, Record<string, unknown>>
    ).encryptedFinancials

    expect(newFinancials).toEqual({ value: 250.5, originalValue: 300 })
    expect(existingFinancials).toEqual({ value: 250.5, originalValue: 300 })
  })
})

describe('upsertTransactions', () => {
  it('does not overwrite encrypted fields for existing transactions', async () => {
    const t = convexTest(schema, modules)
    const { portfolioId, bankAccountId } = await seedTestData(t)

    const powensTxnId = 12345
    await t.run(async (ctx) => {
      await ctx.db.insert('transactions', {
        bankAccountId,
        portfolioId,
        powensTransactionId: powensTxnId,
        date: '2026-01-15',
        coming: false,
        active: true,
        deleted: false,
        encryptedDetails: 'user-customized-details',
        encryptedFinancials: 'old-financials',
        encryptedCategories: 'user-customized-categories',
      })
    })

    const result = await t.mutation(internal.powens.upsertTransactions, {
      bankAccountId,
      portfolioId,
      transactions: [
        {
          powensTransactionId: powensTxnId,
          date: '2026-01-15',
          coming: false,
          active: true,
          deleted: false,
          encryptedDetails: '',
          encryptedFinancials: '',
          encryptedCategories: '',
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].isNew).toBe(false)

    const txn = await t.run(async (ctx) => {
      return await ctx.db.get('transactions', result[0].id)
    })
    expect(txn?.encryptedDetails).toBe('user-customized-details')
    expect(txn?.encryptedCategories).toBe('user-customized-categories')
    expect(txn?.encryptedFinancials).toBe('old-financials')
  })

  it('writes all encrypted fields for new transactions', async () => {
    const t = convexTest(schema, modules)
    const { portfolioId, bankAccountId } = await seedTestData(t)

    const result = await t.mutation(internal.powens.upsertTransactions, {
      bankAccountId,
      portfolioId,
      transactions: [
        {
          powensTransactionId: 99999,
          date: '2026-02-01',
          coming: false,
          active: true,
          deleted: false,
          encryptedDetails: '',
          encryptedFinancials: '',
          encryptedCategories: '',
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].isNew).toBe(true)

    const txn = await t.run(async (ctx) => {
      return await ctx.db.get('transactions', result[0].id)
    })
    expect(txn?.encryptedDetails).toBe('')
    expect(txn?.encryptedFinancials).toBe('')
    expect(txn?.encryptedCategories).toBe('')
  })

  it('updates metadata fields for existing transactions', async () => {
    const t = convexTest(schema, modules)
    const { portfolioId, bankAccountId } = await seedTestData(t)

    const txnId = await t.run(async (ctx) => {
      return await ctx.db.insert('transactions', {
        bankAccountId,
        portfolioId,
        powensTransactionId: 555,
        date: '2026-01-01',
        coming: true,
        active: true,
        deleted: false,
        encryptedDetails: 'custom-details',
        encryptedFinancials: 'custom-financials',
        encryptedCategories: 'custom-categories',
      })
    })

    await t.mutation(internal.powens.upsertTransactions, {
      bankAccountId,
      portfolioId,
      transactions: [
        {
          powensTransactionId: 555,
          date: '2026-01-01',
          coming: false,
          active: true,
          deleted: false,
          encryptedDetails: '',
          encryptedFinancials: '',
          encryptedCategories: '',
        },
      ],
    })

    const txn = await t.run(async (ctx) => {
      return await ctx.db.get('transactions', txnId)
    })
    // Metadata was updated
    expect(txn?.coming).toBe(false)
    // Encrypted fields preserved
    expect(txn?.encryptedDetails).toBe('custom-details')
    expect(txn?.encryptedFinancials).toBe('custom-financials')
    expect(txn?.encryptedCategories).toBe('custom-categories')
  })
})
