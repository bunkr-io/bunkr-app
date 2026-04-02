import { useConvexAuth, useQuery } from 'convex/react'
import * as React from 'react'
import { api } from '../../convex/_generated/api'
import type { SubscriptionStatus } from '../../convex/lib/billing'

type BillingQueryResult =
  | (SubscriptionStatus & {
      currentSeats: number
      pendingInvitations: number
    })
  | null
  | undefined

interface BillingContextValue {
  subscription: BillingQueryResult
}

const BillingContext = React.createContext<BillingContextValue | null>(null)

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const subscription = useQuery(
    api.billing.getSubscriptionStatus,
    isAuthenticated ? {} : 'skip',
  )

  return (
    <BillingContext.Provider value={{ subscription }}>
      {children}
    </BillingContext.Provider>
  )
}

export function useBilling() {
  const ctx = React.useContext(BillingContext)
  if (!ctx) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return ctx
}
