import * as Sentry from '@sentry/tanstackstart-react'
import { useAction, useMutation } from 'convex/react'
import { ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { HotkeyDisplay, Kbd } from '~/components/ui/kbd'
import { Label } from '~/components/ui/label'
import { useEncryption } from '~/contexts/encryption-context'
import { encryptString, importPublicKey } from '~/lib/crypto'
import { api } from '../../convex/_generated/api'

interface ActivateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivateAgentDialog({
  open,
  onOpenChange,
}: ActivateAgentDialogProps) {
  const generateKeyPair = useAction(api.agent.generateAgentKeyPairAction)
  const activateAgent = useMutation(api.agent.activateAgent)
  const { workspacePrivateKeyJwk, unlock } = useEncryption()

  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingActivation, setPendingActivation] = useState(false)
  const [agentPublicKeyJwk, setAgentPublicKeyJwk] = useState<string | null>(
    null,
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPassphrase('')
        setError(null)
        setAgentPublicKeyJwk(null)
        setPendingActivation(false)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  const doActivate = useCallback(
    async (wsPrivateKeyJwk: string, pubKeyJwk: string) => {
      const recipientPubKey = await importPublicKey(pubKeyJwk)
      const encryptedWsPrivateKey = await encryptString(
        wsPrivateKeyJwk,
        recipientPubKey,
      )
      await activateAgent({
        encryptedWorkspacePrivateKey: encryptedWsPrivateKey,
      })
      toast.success('Bunkr Agent activated')
      handleOpenChange(false)
    },
    [activateAgent, handleOpenChange],
  )

  // After passphrase unlock, the key becomes available on next render
  useEffect(() => {
    if (pendingActivation && workspacePrivateKeyJwk && agentPublicKeyJwk) {
      setPendingActivation(false)
      setLoading(true)
      doActivate(workspacePrivateKeyJwk, agentPublicKeyJwk).finally(() =>
        setLoading(false),
      )
    }
  }, [pendingActivation, workspacePrivateKeyJwk, agentPublicKeyJwk, doActivate])

  async function handleConfirm() {
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      // Step 1: Unlock vault if needed
      if (!workspacePrivateKeyJwk) {
        if (!passphrase) {
          setError('Please enter your passphrase.')
          setLoading(false)
          return
        }
        try {
          await unlock(passphrase)
        } catch {
          setError('Invalid passphrase. Please try again.')
          setLoading(false)
          return
        }
      }

      // Step 2: Generate agent keypair server-side
      const { publicKeyJwk } = await generateKeyPair()
      setAgentPublicKeyJwk(publicKeyJwk)

      // Step 3: Encrypt workspace private key with agent's public key
      if (workspacePrivateKeyJwk) {
        await doActivate(workspacePrivateKeyJwk, publicKeyJwk)
      } else {
        // Key will be available on next render after unlock
        setPendingActivation(true)
        setLoading(false)
      }
    } catch (error) {
      Sentry.captureException(error)
      toast.error('Failed to activate Bunkr Agent')
      setLoading(false)
    }
  }

  const isVaultUnlocked = !!workspacePrivateKeyJwk
  const canSubmit = isVaultUnlocked || passphrase.length > 0

  useHotkeys('escape', handleCancel, {
    enabled: open,
    enableOnFormTags: true,
    preventDefault: true,
  })

  useHotkeys(
    'mod+enter',
    () => {
      void handleConfirm()
    },
    {
      enabled: open && canSubmit && !loading,
      enableOnFormTags: true,
      preventDefault: true,
    },
  )

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            Activate Bunkr Agent
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Bunkr Agent is an AI assistant that can analyze your financial
                data, answer questions about your spending, and provide insights
                about your portfolios.
              </p>
              <p>
                To work, the agent needs server-side access to your encrypted
                financial data. When activated:
              </p>
              <ul className="list-disc space-y-1 pl-4 text-sm">
                <li>
                  A secure keypair is generated and the agent is added as a
                  workspace member
                </li>
                <li>
                  Our servers can decrypt your financial data for AI processing
                </li>
                <li>
                  Conversations with the agent are stored{' '}
                  <strong>unencrypted</strong> on our servers
                </li>
                <li>
                  You can revoke access at any time — all agent data will be
                  deleted
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isVaultUnlocked && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="agent-passphrase">Passphrase</Label>
            <Input
              id="agent-passphrase"
              type="password"
              placeholder="Your encryption passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <AlertDialogFooter>
          <Button variant="outline" disabled={loading} onClick={handleCancel}>
            Cancel <Kbd>Esc</Kbd>
          </Button>
          <Button
            disabled={loading || !canSubmit}
            loading={loading}
            onClick={() => void handleConfirm()}
          >
            Activate Agent <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
