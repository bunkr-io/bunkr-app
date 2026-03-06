import * as React from 'react'
import { useQuery } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  importPrivateKey,
  decryptData,
  getStoredPrivateKey,
  storePrivateKey,
  clearStoredPrivateKey,
  deriveKeyFromPassphrase,
  decryptPrivateKey as decryptPrivateKeyWithPassphrase,
} from '~/lib/crypto'

interface EncryptionContextValue {
  isEncryptionEnabled: boolean
  isUnlocked: boolean
  isLoading: boolean
  privateKey: CryptoKey | null
  unlock: (passphrase: string) => Promise<void>
  lock: () => void
  encryptedPrivateKey: string | null
  pbkdf2Salt: string | null
}

const EncryptionContext = React.createContext<EncryptionContextValue | null>(null)

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const encryptionKey = useQuery(
    api.encryptionKeys.getEncryptionKey,
    isAuthenticated ? {} : 'skip',
  )

  const [privateKey, setPrivateKey] = React.useState<CryptoKey | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const importingRef = React.useRef(false)

  const isEncryptionEnabled = encryptionKey != null && encryptionKey !== undefined
  const isUnlocked = privateKey !== null

  // On mount, try to load private key from localStorage
  React.useEffect(() => {
    if (encryptionKey === undefined) return // still loading query
    if (!encryptionKey) {
      setIsLoading(false)
      return
    }
    if (importingRef.current) return
    importingRef.current = true

    const stored = getStoredPrivateKey()
    if (stored) {
      importPrivateKey(stored)
        .then(setPrivateKey)
        .catch(() => {
          clearStoredPrivateKey()
        })
        .finally(() => {
          setIsLoading(false)
          importingRef.current = false
        })
    } else {
      setIsLoading(false)
      importingRef.current = false
    }
  }, [encryptionKey])

  const unlock = React.useCallback(
    async (passphrase: string) => {
      if (!encryptionKey) throw new Error('Encryption not enabled')

      const salt = Uint8Array.from(atob(encryptionKey.pbkdf2Salt), (c) =>
        c.charCodeAt(0),
      )
      const passphraseKey = await deriveKeyFromPassphrase(passphrase, salt)
      const { ct, iv } = JSON.parse(encryptionKey.encryptedPrivateKey) as {
        ct: string
        iv: string
      }
      const privateKeyJwk = await decryptPrivateKeyWithPassphrase(
        { ct, iv },
        passphraseKey,
      )

      const key = await importPrivateKey(privateKeyJwk)
      storePrivateKey(privateKeyJwk)
      setPrivateKey(key)
    },
    [encryptionKey],
  )

  const lock = React.useCallback(() => {
    clearStoredPrivateKey()
    setPrivateKey(null)
  }, [])

  const value = React.useMemo(
    () => ({
      isEncryptionEnabled,
      isUnlocked,
      isLoading,
      privateKey,
      unlock,
      lock,
      encryptedPrivateKey: encryptionKey?.encryptedPrivateKey ?? null,
      pbkdf2Salt: encryptionKey?.pbkdf2Salt ?? null,
    }),
    [isEncryptionEnabled, isUnlocked, isLoading, privateKey, unlock, lock, encryptionKey],
  )

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  const ctx = React.useContext(EncryptionContext)
  if (!ctx) {
    throw new Error('useEncryption must be used within EncryptionProvider')
  }
  return ctx
}

// Hook to transparently decrypt records that may have encrypted data
export function useDecryptRecords<T extends { encryptedData?: string }>(
  records: T[] | undefined,
): T[] | undefined {
  const { privateKey, isEncryptionEnabled, isLoading } = useEncryption()
  const [decrypted, setDecrypted] = React.useState<T[] | undefined>(undefined)
  const prevRef = React.useRef<{ records: T[] | undefined; key: CryptoKey | null }>({
    records: undefined,
    key: null,
  })

  React.useEffect(() => {
    if (records === undefined) {
      setDecrypted(undefined)
      return
    }

    // No encryption or still loading — pass through
    if (!isEncryptionEnabled || isLoading) {
      setDecrypted(records)
      return
    }

    // No encrypted records — pass through
    const hasEncrypted = records.some((r) => r.encryptedData)
    if (!hasEncrypted) {
      setDecrypted(records)
      return
    }

    // Not unlocked yet — return undefined to show loading
    if (!privateKey) {
      setDecrypted(undefined)
      return
    }

    // Skip if same inputs
    if (prevRef.current.records === records && prevRef.current.key === privateKey) {
      return
    }
    prevRef.current = { records, key: privateKey }

    let cancelled = false
    async function run() {
      const results = await Promise.all(
        records!.map(async (r) => {
          if (!r.encryptedData) return r
          try {
            const data = await decryptData(r.encryptedData, privateKey!)
            return { ...r, ...data } as T
          } catch {
            return r
          }
        }),
      )
      if (!cancelled) setDecrypted(results)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [records, privateKey, isEncryptionEnabled, isLoading])

  return decrypted
}

// Hook to decrypt a single record
export function useDecryptRecord<T extends { encryptedData?: string }>(
  record: T | null | undefined,
): T | null | undefined {
  const arr = React.useMemo(
    () => (record ? [record] : undefined),
    [record],
  )
  const result = useDecryptRecords(arr)
  if (record === null) return null
  if (record === undefined) return undefined
  return result?.[0]
}
