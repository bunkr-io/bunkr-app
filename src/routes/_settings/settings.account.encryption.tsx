import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { KeyRound, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ItemCard,
  ItemCardItem,
  ItemCardItemAction,
  ItemCardItemContent,
  ItemCardItemDescription,
  ItemCardItems,
  ItemCardItemTitle,
} from '~/components/item-card'
import { RecoveryCodesDisplay } from '~/components/recovery-codes-display'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { HotkeyDisplay, Kbd } from '~/components/ui/kbd'
import { PageHeader } from '~/components/ui/page-header'
import { Skeleton } from '~/components/ui/skeleton'
import { useEncryption } from '~/contexts/encryption-context'
import { usePortfolio } from '~/contexts/portfolio-context'
import {
  decryptData,
  decryptFieldGroups,
  decryptPrivateKey,
  deriveKeyFromPassphrase,
  encryptData,
  encryptFieldGroups,
  encryptPrivateKeyWithRecoveryCode,
  encryptString,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  generateRecoveryCodes,
  importPrivateKey,
  importPublicKey,
  storePrivateKey,
} from '~/lib/crypto'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/_settings/settings/account/encryption')({
  component: EncryptionPage,
})

function EncryptionPage() {
  const { t } = useTranslation()
  const {
    isEncryptionEnabled,
    isUnlocked,
    isLoading,
    hasPersonalKey,
    hasWorkspaceAccess,
    role,
  } = useEncryption()
  const [rotateOpen, setRotateOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const recoveryStatus = useQuery(api.encryptionKeys.getRecoveryCodeStatus)

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-10 py-16">
        <header>
          <Skeleton className="h-9 w-48" />
        </header>
        <div className="mt-8 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-10 py-16">
      <PageHeader
        title={t('settings.encryption.title')}
        description={t('settings.encryption.description')}
      />
      <div className="mt-8 space-y-6">
        <div>
          <h2 className="text-lg font-medium">
            {t('settings.encryption.zeroKnowledge')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('settings.encryption.zeroKnowledgeDescription')}
          </p>
        </div>

        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{t('settings.encryption.important')}</AlertTitle>
          <AlertDescription>
            {t('settings.encryption.noResetWarning')}
          </AlertDescription>
        </Alert>

        <ItemCard>
          <ItemCardItems>
            <ItemCardItem>
              <ItemCardItemContent>
                <ItemCardItemTitle>
                  {t('settings.encryption.status')}
                  <Badge variant="secondary" className="ml-2">
                    <ShieldCheck className="size-3" />
                    {t('settings.encryption.enabled')}
                  </Badge>
                </ItemCardItemTitle>
                <ItemCardItemDescription>
                  {isEncryptionEnabled &&
                    !hasPersonalKey &&
                    t('settings.encryption.statusSetup')}
                  {isEncryptionEnabled &&
                    hasPersonalKey &&
                    !hasWorkspaceAccess &&
                    t('settings.encryption.statusPendingAccess')}
                  {isEncryptionEnabled &&
                    isUnlocked &&
                    t('settings.encryption.statusUnlocked')}
                  {isEncryptionEnabled &&
                    hasPersonalKey &&
                    hasWorkspaceAccess &&
                    !isUnlocked &&
                    t('settings.encryption.statusLocked')}
                  {!isEncryptionEnabled &&
                    t('settings.encryption.statusAlwaysEnabled')}
                </ItemCardItemDescription>
              </ItemCardItemContent>
            </ItemCardItem>

            {isEncryptionEnabled && isUnlocked && role === 'owner' && (
              <ItemCardItem>
                <ItemCardItemContent>
                  <ItemCardItemTitle>
                    {t('settings.encryption.keyRotation')}
                  </ItemCardItemTitle>
                  <ItemCardItemDescription>
                    {t('settings.encryption.keyRotationDescription')}
                  </ItemCardItemDescription>
                </ItemCardItemContent>
                <ItemCardItemAction>
                  <Button variant="outline" onClick={() => setRotateOpen(true)}>
                    <KeyRound className="size-4" />
                    {t('settings.encryption.rotateKeys')}
                  </Button>
                </ItemCardItemAction>
              </ItemCardItem>
            )}

            {isEncryptionEnabled && role === 'owner' && (
              <ItemCardItem>
                <ItemCardItemContent>
                  <ItemCardItemTitle>
                    {t('recoveryCodes.settingsTitle')}
                    {recoveryStatus && recoveryStatus.remainingCodes === 0 && (
                      <Badge variant="destructive" className="ml-2">
                        <ShieldAlert className="size-3" />
                        {t('recoveryCodes.noneRemaining')}
                      </Badge>
                    )}
                  </ItemCardItemTitle>
                  <ItemCardItemDescription>
                    {recoveryStatus
                      ? t('recoveryCodes.remainingCount', {
                          remaining: recoveryStatus.remainingCodes,
                          total: recoveryStatus.totalCodes,
                        })
                      : t('recoveryCodes.noCodesGenerated')}
                  </ItemCardItemDescription>
                </ItemCardItemContent>
                <ItemCardItemAction>
                  <Button
                    variant="outline"
                    onClick={() => setRegenerateOpen(true)}
                  >
                    {recoveryStatus
                      ? t('recoveryCodes.regenerate')
                      : t('recoveryCodes.generate')}
                  </Button>
                </ItemCardItemAction>
              </ItemCardItem>
            )}
          </ItemCardItems>
        </ItemCard>
      </div>

      {rotateOpen && (
        <KeyRotationDialog open={rotateOpen} onOpenChange={setRotateOpen} />
      )}
      {regenerateOpen && (
        <RegenerateRecoveryCodesDialog
          open={regenerateOpen}
          onOpenChange={setRegenerateOpen}
          hasExistingCodes={recoveryStatus !== null}
        />
      )}
    </div>
  )
}

function KeyRotationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { privateKey, workspacePublicKey } = useEncryption()
  const { allPortfolioIds } = usePortfolio()

  const allConnections = useQuery(
    api.powens.listAllConnections,
    allPortfolioIds.length > 0 ? { portfolioIds: allPortfolioIds } : 'skip',
  )
  const allBankAccounts = useQuery(
    api.powens.listAllBankAccounts,
    allPortfolioIds.length > 0 ? { portfolioIds: allPortfolioIds } : 'skip',
  )
  const allSnapshots = useQuery(
    api.balanceSnapshots.listAllSnapshotsByPortfolios,
    allPortfolioIds.length > 0
      ? { portfolioIds: allPortfolioIds, startTimestamp: 0 }
      : 'skip',
  )
  const allInvestments = useQuery(
    api.investments.listAllInvestmentsByPortfolios,
    allPortfolioIds.length > 0 ? { portfolioIds: allPortfolioIds } : 'skip',
  )
  const allTransactions = useQuery(
    api.transactions.listAllTransactions,
    allPortfolioIds.length > 0 ? { portfolioIds: allPortfolioIds } : 'skip',
  )

  const BATCH_SIZE = 50

  const rotateKey = useMutation(api.encryptionKeys.rotateWorkspaceKey)
  const completeRotation = useMutation(api.encryptionKeys.completeKeyRotation)
  const reEncryptConnection = useMutation(
    api.encryptionKeys.reEncryptConnection,
  )
  const reEncryptAccount = useMutation(api.encryptionKeys.reEncryptBankAccount)
  const reEncryptSnapshotBatch = useMutation(
    api.encryptionKeys.reEncryptBalanceSnapshotBatch,
  )
  const reEncryptInvestmentBatch = useMutation(
    api.encryptionKeys.reEncryptInvestmentBatch,
  )
  const reEncryptTransactionBatch = useMutation(
    api.encryptionKeys.reEncryptTransactionBatch,
  )

  const [passphrase, setPassphrase] = useState('')
  const [rotating, setRotating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [step, setStep] = useState<'passphrase' | 'rotating'>('passphrase')
  const cancelRef = useRef(false)
  const isCancelled = () => cancelRef.current

  const encryptedConnections =
    allConnections?.filter((c) => c.encryptedData) ?? []
  const encryptedAccounts =
    allBankAccounts?.filter((a) => a.encryptedIdentity || a.encryptedBalance) ??
    []
  const encryptedSnapshots = allSnapshots?.filter((s) => s.encryptedData) ?? []
  const encryptedInvestments =
    allInvestments?.filter(
      (inv) => inv.encryptedIdentity || inv.encryptedValuation,
    ) ?? []
  const encryptedTransactions =
    allTransactions?.filter(
      (t) =>
        t.encryptedDetails || t.encryptedFinancials || t.encryptedCategories,
    ) ?? []

  const totalRecords =
    encryptedConnections.length +
    encryptedAccounts.length +
    encryptedSnapshots.length +
    encryptedInvestments.length +
    encryptedTransactions.length

  function handleCancel() {
    cancelRef.current = true
  }

  const membersStatus = useQuery(api.encryptionKeys.listMembersEncryptionStatus)

  async function handleRotateComplete() {
    if (!privateKey || !passphrase || !workspacePublicKey || !membersStatus)
      return

    const ownerMember = membersStatus.find((m) => m.role === 'owner')
    if (!ownerMember?.publicKey) {
      toast.error(t('toast.ownerKeyNotFound'))
      return
    }

    cancelRef.current = false
    setRotating(true)
    setStep('rotating')

    try {
      const newWsKeyPair = await generateKeyPair()
      const newWsPublicKeyJwk = await exportPublicKey(newWsKeyPair.publicKey)
      const newWsPrivateKeyJwk = await exportPrivateKey(newWsKeyPair.privateKey)

      const personalPublicKey = await importPublicKey(ownerMember.publicKey)
      const ownerKeySlotEncrypted = await encryptString(
        newWsPrivateKeyJwk,
        personalPublicKey,
      )

      await rotateKey({
        newWorkspacePublicKey: newWsPublicKeyJwk,
        ownerKeySlotEncryptedPrivateKey: ownerKeySlotEncrypted,
      })

      const newPublicKey = newWsKeyPair.publicKey
      const total = totalRecords
      setProgress({ done: 0, total })
      let done = 0

      for (const conn of encryptedConnections) {
        if (isCancelled()) break
        const data = await decryptData(
          conn.encryptedData as string,
          privateKey,
          conn._id,
        )
        const encrypted = await encryptData(data, newPublicKey, conn._id)
        await reEncryptConnection({
          connectionId: conn._id,
          encryptedData: encrypted,
        })
        done++
        setProgress({ done, total })
      }

      for (const acct of encryptedAccounts) {
        if (isCancelled()) break
        const data = await decryptFieldGroups(
          {
            encryptedIdentity: acct.encryptedIdentity,
            encryptedBalance: acct.encryptedBalance,
          },
          privateKey,
          acct._id,
        )
        const groups = await encryptFieldGroups(
          {
            encryptedIdentity: {
              name: data.name,
              number: data.number,
              iban: data.iban,
            },
            encryptedBalance: { balance: data.balance },
          },
          newPublicKey,
          acct._id,
        )
        await reEncryptAccount({
          bankAccountId: acct._id,
          encryptedIdentity: groups.encryptedIdentity,
          encryptedBalance: groups.encryptedBalance,
        })
        done++
        setProgress({ done, total })
      }

      for (let i = 0; i < encryptedSnapshots.length; i += BATCH_SIZE) {
        if (isCancelled()) break
        const chunk = encryptedSnapshots.slice(i, i + BATCH_SIZE)
        const items = await Promise.all(
          chunk.map(async (snap) => {
            const data = await decryptData(
              snap.encryptedData as string,
              privateKey,
              snap._id,
            )
            return {
              snapshotId: snap._id,
              encryptedData: await encryptData(data, newPublicKey, snap._id),
            }
          }),
        )
        if (isCancelled()) break
        await reEncryptSnapshotBatch({ items })
        done += chunk.length
        setProgress({ done, total })
      }

      for (let i = 0; i < encryptedInvestments.length; i += BATCH_SIZE) {
        if (isCancelled()) break
        const chunk = encryptedInvestments.slice(i, i + BATCH_SIZE)
        const items = await Promise.all(
          chunk.map(async (inv) => {
            const data = await decryptFieldGroups(
              {
                encryptedIdentity: inv.encryptedIdentity,
                encryptedValuation: inv.encryptedValuation,
              },
              privateKey,
              inv._id,
            )
            const groups = await encryptFieldGroups(
              {
                encryptedIdentity: {
                  code: data.code,
                  label: data.label,
                  description: data.description,
                },
                encryptedValuation: {
                  quantity: data.quantity,
                  unitprice: data.unitprice,
                  unitvalue: data.unitvalue,
                  valuation: data.valuation,
                  portfolioShare: data.portfolioShare,
                  diff: data.diff,
                  diffPercent: data.diffPercent,
                },
              },
              newPublicKey,
              inv._id,
            )
            return {
              investmentId: inv._id,
              encryptedIdentity: groups.encryptedIdentity,
              encryptedValuation: groups.encryptedValuation,
            }
          }),
        )
        if (isCancelled()) break
        await reEncryptInvestmentBatch({ items })
        done += chunk.length
        setProgress({ done, total })
      }

      for (let i = 0; i < encryptedTransactions.length; i += BATCH_SIZE) {
        if (isCancelled()) break
        const chunk = encryptedTransactions.slice(i, i + BATCH_SIZE)
        const items = await Promise.all(
          chunk.map(async (txn) => {
            const data = await decryptFieldGroups(
              {
                encryptedDetails: txn.encryptedDetails,
                encryptedFinancials: txn.encryptedFinancials,
                encryptedCategories: txn.encryptedCategories,
              },
              privateKey,
              txn._id,
            )
            const groups = await encryptFieldGroups(
              {
                encryptedDetails: {
                  wording: data.wording,
                  originalWording: data.originalWording,
                  simplifiedWording: data.simplifiedWording,
                  counterparty: data.counterparty,
                  card: data.card,
                  comment: data.comment,
                },
                encryptedFinancials: {
                  value: data.value,
                  originalValue: data.originalValue,
                },
                encryptedCategories: {
                  category: data.category,
                  categoryParent: data.categoryParent,
                  userCategoryKey: data.userCategoryKey,
                },
              },
              newPublicKey,
              txn._id,
            )
            return {
              transactionId: txn._id,
              encryptedDetails: groups.encryptedDetails,
              encryptedFinancials: groups.encryptedFinancials,
              encryptedCategories: groups.encryptedCategories,
            }
          }),
        )
        if (isCancelled()) break
        await reEncryptTransactionBatch({ items })
        done += chunk.length
        setProgress({ done, total })
      }

      if (isCancelled()) {
        toast.info(t('toast.keyRotationPaused', { processed: done, total }))
      } else {
        await completeRotation()

        const newWsKey = await importPrivateKey(newWsPrivateKeyJwk)
        await storePrivateKey(newWsKey)

        toast.success(t('toast.keyRotationComplete'))
        onOpenChange(false)
        window.location.reload()
      }
    } catch (err) {
      toast.error(t('toast.keyRotationFailed'))
      console.error(err)
    } finally {
      setRotating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('settings.encryption.rotateKeysTitle')}</DialogTitle>
          <DialogDescription>
            {t('settings.encryption.rotateKeysDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {step === 'passphrase' && (
            <>
              <Alert>
                <TriangleAlert />
                <AlertTitle>
                  {t('settings.encryption.rotateKeysWarningTitle')}
                </AlertTitle>
                <AlertDescription>
                  {t('settings.encryption.rotateKeysWarning')}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <label
                  htmlFor="rotation-passphrase"
                  className="text-sm font-medium"
                >
                  {t('settings.encryption.enterPassphrase')}
                </label>
                <Input
                  id="rotation-passphrase"
                  type="password"
                  placeholder={t('settings.encryption.passphrasePlaceholder')}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              {totalRecords > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.encryption.recordsToReencrypt', {
                    count: totalRecords,
                  })}
                </p>
              )}
            </>
          )}
          {step === 'rotating' && (
            <div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.encryption.reencryptingProgress', {
                  processed: progress.done,
                  total: progress.total,
                })}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {rotating ? (
            <Button variant="outline" onClick={handleCancel}>
              {t('settings.encryption.stop')}
            </Button>
          ) : (
            <RotationFooter
              onCancel={() => onOpenChange(false)}
              onConfirm={handleRotateComplete}
              disabled={!passphrase || rotating}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RegenerateRecoveryCodesDialog({
  open,
  onOpenChange,
  hasExistingCodes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasExistingCodes: boolean
}) {
  const { t } = useTranslation()
  const [passphrase, setPassphrase] = useState('')
  const [phase, setPhase] = useState<'passphrase' | 'codes'>('passphrase')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[]>([])

  const encryptionState = useQuery(api.encryptionKeys.getWorkspaceEncryption)
  const regenerate = useMutation(api.encryptionKeys.regenerateRecoveryCodes)

  async function handlePassphraseSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passphrase || !encryptionState?.personalKey) return
    setError(null)
    setLoading(true)
    try {
      const salt = Uint8Array.from(
        atob(encryptionState.personalKey.pbkdf2Salt),
        (c) => c.charCodeAt(0),
      )
      const passphraseKey = await deriveKeyFromPassphrase(passphrase, salt)
      const { ct, iv } = JSON.parse(
        encryptionState.personalKey.encryptedPrivateKey,
      ) as { ct: string; iv: string }
      const pkJwk = await decryptPrivateKey({ ct, iv }, passphraseKey)

      const newCodes = generateRecoveryCodes()
      const slots = await Promise.all(
        newCodes.map(async (code, i) => {
          const result = await encryptPrivateKeyWithRecoveryCode(pkJwk, code)
          return {
            codeHash: result.codeHash,
            encryptedPrivateKey: JSON.stringify({
              ct: result.ct,
              iv: result.iv,
            }),
            pbkdf2Salt: result.salt,
            slotIndex: i,
          }
        }),
      )

      await regenerate({ slots })

      setCodes(newCodes)
      setPhase('codes')
    } catch {
      setError(t('toast.invalidPassphrase'))
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setPassphrase('')
    setError(null)
    setPhase('passphrase')
    setCodes([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false}>
        {phase === 'passphrase' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {hasExistingCodes
                  ? t('recoveryCodes.regenerateTitle')
                  : t('recoveryCodes.generateTitle')}
              </DialogTitle>
              <DialogDescription>
                {hasExistingCodes
                  ? t('recoveryCodes.regenerateDescription')
                  : t('recoveryCodes.generateDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePassphraseSubmit}>
              <div className="space-y-4 py-2">
                {hasExistingCodes && (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertDescription>
                      {t('recoveryCodes.regenerateWarning')}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <label
                    htmlFor="regen-passphrase"
                    className="text-sm font-medium"
                  >
                    {t('dialogs.passphrase.label')}
                  </label>
                  <Input
                    id="regen-passphrase"
                    type="password"
                    placeholder={t('dialogs.passphrase.placeholder')}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    autoFocus
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              </div>
              <RegeneratePassphraseFooter
                onCancel={handleClose}
                disabled={!passphrase}
                loading={loading}
                hasExistingCodes={hasExistingCodes}
              />
            </form>
          </>
        )}

        {phase === 'codes' && codes.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('recoveryCodes.title')}</DialogTitle>
              <DialogDescription>
                {t('recoveryCodes.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <RecoveryCodesDisplay
                codes={codes}
                onConfirm={handleClose}
                confirmLabel={t('common.done')}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RegeneratePassphraseFooter({
  onCancel,
  disabled,
  loading,
  hasExistingCodes,
}: {
  onCancel: () => void
  disabled: boolean
  loading: boolean
  hasExistingCodes: boolean
}) {
  const { t } = useTranslation()
  useHotkeys('escape', onCancel, {
    enableOnFormTags: true,
    preventDefault: true,
  })

  return (
    <DialogFooter className="mt-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        {t('common.cancel')} <Kbd>Esc</Kbd>
      </Button>
      <Button type="submit" disabled={disabled} loading={loading}>
        {hasExistingCodes
          ? t('recoveryCodes.regenerate')
          : t('recoveryCodes.generate')}{' '}
        <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
      </Button>
    </DialogFooter>
  )
}

function RotationFooter({
  onCancel,
  onConfirm,
  disabled,
}: {
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const handleConfirm = useCallback(() => {
    if (!disabled) onConfirm()
  }, [disabled, onConfirm])

  useHotkeys('escape', onCancel, {
    enableOnFormTags: true,
    preventDefault: true,
  })

  useHotkeys('mod+enter', handleConfirm, {
    enabled: !disabled,
    enableOnFormTags: true,
    preventDefault: true,
  })

  return (
    <>
      <Button variant="outline" onClick={onCancel}>
        {t('common.cancel')} <Kbd>Esc</Kbd>
      </Button>
      <Button onClick={handleConfirm} disabled={disabled}>
        {t('settings.encryption.rotateKeys')}{' '}
        <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
      </Button>
    </>
  )
}
