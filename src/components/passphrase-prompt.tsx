import { useState } from 'react'
import { useEncryption } from '~/contexts/encryption-context'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Lock } from 'lucide-react'

export function PassphrasePrompt() {
  const { isEncryptionEnabled, isUnlocked, isLoading, unlock } = useEncryption()
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  if (isLoading || !isEncryptionEnabled || isUnlocked) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passphrase.trim()) return
    setError(null)
    setUnlocking(true)
    try {
      await unlock(passphrase)
    } catch {
      setError('Incorrect passphrase')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Unlock your vault</h2>
          <p className="text-sm text-muted-foreground">
            Enter your encryption passphrase to access your financial data.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={unlocking}>
            {unlocking ? 'Unlocking...' : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  )
}
