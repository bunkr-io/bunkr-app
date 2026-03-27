import * as React from 'react'
import { getCategoryKey } from '~/lib/account-categories'

interface Snapshot {
  _id: string
  bankAccountId: string
  portfolioId: string
  date: string
  timestamp: number
  currency: string
  balance: number
}

interface BankAccount {
  _id: string
  type?: string
}

interface DailyNetWorthEntry {
  date: string
  balance: number
}

interface DailyCategoryBalanceEntry {
  date: string
  category: string
  balance: number
}

/**
 * Client-side aggregation of decrypted balance snapshots.
 *
 * Implements carry-forward logic: for dates where an account has no snapshot,
 * the most recent prior snapshot balance for that account is used.
 */
export function useAggregatedBalances(
  snapshots: Snapshot[] | undefined,
  bankAccounts: BankAccount[] | undefined,
): {
  dailyNetWorth: DailyNetWorthEntry[] | undefined
  dailyCategoryBalance: DailyCategoryBalanceEntry[] | undefined
} {
  return React.useMemo(() => {
    if (!snapshots || !bankAccounts) {
      return { dailyNetWorth: undefined, dailyCategoryBalance: undefined }
    }

    // Build account type map
    const accountTypeMap = new Map<string, string | undefined>()
    for (const a of bankAccounts) {
      accountTypeMap.set(a._id, a.type)
    }

    // Group snapshots by bankAccountId, sorted by date
    const byAccount = new Map<string, Map<string, number>>()
    for (const s of snapshots) {
      let dateMap = byAccount.get(s.bankAccountId)
      if (!dateMap) {
        dateMap = new Map()
        byAccount.set(s.bankAccountId, dateMap)
      }
      // Keep the latest snapshot per account per date
      dateMap.set(s.date, s.balance)
    }

    // Collect all unique dates and sort
    const allDates = new Set<string>()
    for (const s of snapshots) {
      allDates.add(s.date)
    }
    const sortedDates = [...allDates].sort()

    if (sortedDates.length === 0) {
      return { dailyNetWorth: [], dailyCategoryBalance: [] }
    }

    // For each date, compute per-account balance with carry-forward
    const accountIds = [...byAccount.keys()]
    const dailyNetWorthMap = new Map<string, number>()
    const dailyCategoryBalanceMap = new Map<string, number>()

    // Track last known balance per account for carry-forward
    const lastBalance = new Map<string, number>()

    for (const date of sortedDates) {
      let netWorth = 0

      for (const accountId of accountIds) {
        const dateMap = byAccount.get(accountId)
        if (!dateMap) continue
        const balance = dateMap.get(date)

        let effectiveBalance: number
        if (balance !== undefined) {
          effectiveBalance = balance
          lastBalance.set(accountId, balance)
        } else {
          effectiveBalance = lastBalance.get(accountId) ?? 0
        }

        netWorth += effectiveBalance

        // Category aggregation
        const category = getCategoryKey(accountTypeMap.get(accountId))
        const catKey = `${date}:${category}`
        dailyCategoryBalanceMap.set(
          catKey,
          (dailyCategoryBalanceMap.get(catKey) ?? 0) + effectiveBalance,
        )
      }

      dailyNetWorthMap.set(date, netWorth)
    }

    const dailyNetWorth: DailyNetWorthEntry[] = sortedDates.map((date) => ({
      date,
      balance: Math.round((dailyNetWorthMap.get(date) ?? 0) * 100) / 100,
    }))

    const dailyCategoryBalance: DailyCategoryBalanceEntry[] = []
    for (const [key, balance] of dailyCategoryBalanceMap) {
      const [date, category] = key.split(':')
      dailyCategoryBalance.push({
        date,
        category,
        balance: Math.round(balance * 100) / 100,
      })
    }
    // Sort by date
    dailyCategoryBalance.sort((a, b) => a.date.localeCompare(b.date))

    return { dailyNetWorth, dailyCategoryBalance }
  }, [snapshots, bankAccounts])
}
