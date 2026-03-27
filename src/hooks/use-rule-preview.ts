import { useConvex } from 'convex/react'
import type { PaginationResult } from 'convex/server'
import { useCallback, useRef, useState } from 'react'
import { useEncryption } from '~/contexts/encryption-context'
import { usePortfolio } from '~/contexts/portfolio-context'
import { decryptFieldGroups } from '~/lib/crypto'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const PAGE_SIZE = 500
const MAX_DISPLAY_MATCHES = 5

export interface PreviewMatch {
  _id: string
  date: string
  wording: string
  value: number
}

interface UseRulePreviewResult {
  matches: PreviewMatch[]
  totalMatched: number
  totalScanned: number
  isScanning: boolean
  error: string | null
  scan: (params: {
    pattern: string
    matchType: 'contains' | 'regex'
    portfolioId?: Id<'portfolios'>
    accountIds?: Array<Id<'bankAccounts'>>
  }) => void
  reset: () => void
}

export function useRulePreview(): UseRulePreviewResult {
  const { privateKey } = useEncryption()
  const { allPortfolioIds } = usePortfolio()
  const convex = useConvex()

  const [matches, setMatches] = useState<PreviewMatch[]>([])
  const [totalMatched, setTotalMatched] = useState(0)
  const [totalScanned, setTotalScanned] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  const reset = useCallback(() => {
    setMatches([])
    setTotalMatched(0)
    setTotalScanned(0)
    setIsScanning(false)
    setError(null)
  }, [])

  const scan = useCallback(
    async (params: {
      pattern: string
      matchType: 'contains' | 'regex'
      portfolioId?: Id<'portfolios'>
      accountIds?: Array<Id<'bankAccounts'>>
    }) => {
      if (!privateKey) {
        setError('Unlock your vault to preview matches')
        return
      }

      // Cancel any running scan
      cancelRef.current = true
      // Allow microtask to propagate cancellation
      await new Promise((r) => setTimeout(r, 0))
      cancelRef.current = false

      setIsScanning(true)
      setError(null)
      setMatches([])
      setTotalMatched(0)
      setTotalScanned(0)

      // Build matcher
      let matcher: (text: string) => boolean
      if (params.matchType === 'regex') {
        try {
          const re = new RegExp(params.pattern, 'i')
          matcher = (text) => re.test(text)
        } catch {
          setError('Invalid regex pattern')
          setIsScanning(false)
          return
        }
      } else {
        const lower = params.pattern.toLowerCase()
        matcher = (text) => text.toLowerCase().includes(lower)
      }

      const accountIdSet =
        params.accountIds && params.accountIds.length > 0
          ? new Set(params.accountIds as string[])
          : null

      const targetPortfolioIds = params.portfolioId
        ? [params.portfolioId]
        : allPortfolioIds

      const collectedMatches: PreviewMatch[] = []
      let matched = 0
      let scanned = 0

      try {
        for (const portfolioId of targetPortfolioIds) {
          if (cancelRef.current) break

          let cursor: string | null = null
          let isDone = false

          while (!isDone) {
            if (cancelRef.current) break

            const result: PaginationResult<
              (typeof api.transactions.listTransactionPage)['_returnType']['page'][number]
            > = await convex.query(api.transactions.listTransactionPage, {
              portfolioId,
              paginationOpts: { numItems: PAGE_SIZE, cursor },
            })

            const page = result.page
            isDone = result.isDone
            cursor = result.continueCursor

            for (const txn of page) {
              if (cancelRef.current) break

              // Account filter
              if (
                accountIdSet &&
                !accountIdSet.has(txn.bankAccountId as string)
              ) {
                scanned++
                continue
              }

              try {
                const details = await decryptFieldGroups(
                  { encryptedDetails: txn.encryptedDetails },
                  privateKey,
                  txn._id,
                )
                const financials = await decryptFieldGroups(
                  { encryptedFinancials: txn.encryptedFinancials },
                  privateKey,
                  txn._id,
                )

                const searchParts = [
                  details.wording,
                  details.originalWording,
                  details.simplifiedWording,
                ].filter(Boolean) as string[]
                const searchText = searchParts.join(' ')

                if (matcher(searchText)) {
                  matched++
                  if (collectedMatches.length < MAX_DISPLAY_MATCHES) {
                    collectedMatches.push({
                      _id: txn._id,
                      date: txn.date,
                      wording:
                        (details.customDescription as string) ||
                        (details.wording as string) ||
                        'Unknown',
                      value: (financials.value as number) ?? 0,
                    })
                    setMatches([...collectedMatches])
                  }
                  setTotalMatched(matched)
                }
              } catch {
                // Skip transactions that fail to decrypt
              }

              scanned++
            }

            setTotalScanned(scanned)
          }

          if (cancelRef.current) break
        }
      } catch {
        if (!cancelRef.current) {
          setError('Failed to scan transactions')
        }
      }

      if (!cancelRef.current) {
        setIsScanning(false)
      }
    },
    [privateKey, allPortfolioIds, convex],
  )

  return { matches, totalMatched, totalScanned, isScanning, error, scan, reset }
}
