import * as React from 'react'

interface PrivacyContextValue {
  isPrivate: boolean
  togglePrivacy: () => void
}

const PrivacyContext = React.createContext<PrivacyContextValue>({
  isPrivate: false,
  togglePrivacy: () => {},
})

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = React.useState(false)
  const togglePrivacy = React.useCallback(() => setIsPrivate((p) => !p), [])

  const value = React.useMemo(
    () => ({ isPrivate, togglePrivacy }),
    [isPrivate, togglePrivacy],
  )

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return React.useContext(PrivacyContext)
}

const MASKED = '••••••'

export function useFormatCurrency() {
  const { isPrivate } = usePrivacy()

  return React.useCallback(
    (value: number, currency: string, opts?: Intl.NumberFormatOptions) => {
      if (isPrivate) return MASKED
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        ...opts,
      }).format(value)
    },
    [isPrivate],
  )
}
