import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { toast } from 'sonner'
import { useEncryption } from '~/contexts/encryption-context'
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  deriveKeyFromPassphrase,
  encryptPrivateKey,
  storePrivateKey,
  clearStoredPrivateKey,
  encryptData,
  decryptData,
  importPublicKey,
} from '~/lib/crypto'
import { useProfile } from '~/contexts/profile-context'
import {
  ItemCard,
  ItemCardItems,
  ItemCardItem,
  ItemCardItemContent,
  ItemCardItemTitle,
  ItemCardItemDescription,
  ItemCardItemAction,
} from '~/components/item-card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Label } from '~/components/ui/label'
import { Check, Copy, Lock, ShieldCheck, TriangleAlert } from 'lucide-react'

export const Route = createFileRoute('/_settings/settings/encryption')({
  component: EncryptionPage,
})

function EncryptionPage() {
  const { isEncryptionEnabled, isUnlocked, isLoading } = useEncryption()
  const { allProfileIds } = useProfile()
  const [setupOpen, setSetupOpen] = useState(false)
  const [migrateOpen, setMigrateOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  const shouldQueryMigration =
    isEncryptionEnabled && isUnlocked && allProfileIds.length > 0
  const allBankAccounts = useQuery(
    api.powens.listAllBankAccounts,
    shouldQueryMigration ? { profileIds: allProfileIds } : 'skip',
  )
  const allSnapshots = useQuery(
    api.balanceSnapshots.listAllSnapshotsByProfiles,
    shouldQueryMigration
      ? { profileIds: allProfileIds, startTimestamp: 0 }
      : 'skip',
  )
  const allInvestments = useQuery(
    api.investments.listAllInvestmentsByProfiles,
    shouldQueryMigration ? { profileIds: allProfileIds } : 'skip',
  )

  const unencryptedCount =
    (allBankAccounts?.filter(
      (a) => !a.encryptedData && (a.balance !== 0 || a.number || a.iban),
    ).length ?? 0) +
    (allSnapshots?.filter((s) => !s.encryptedData && s.balance !== 0).length ??
      0) +
    (allInvestments?.filter((inv) => !inv.encryptedData && inv.valuation !== 0)
      .length ?? 0)

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
      <header>
        <h1 className="text-3xl font-semibold">Encryption</h1>
      </header>
      <div className="mt-8 space-y-6">
        <div>
          <h2 className="text-lg font-medium">Zero-knowledge encryption</h2>
          <p className="text-sm text-muted-foreground">
            Encrypt your financial data so that only you can read it. No one
            else can access your balances, IBANs, or investment details — not
            even us.
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div className="space-y-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Important
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                If you forget your passphrase, your encrypted data cannot be
                recovered. There is no reset mechanism. Store your passphrase
                safely.
              </p>
            </div>
          </div>
        </div>

        <ItemCard>
          <ItemCardItems>
            <ItemCardItem>
              <ItemCardItemContent>
                <ItemCardItemTitle>
                  Status
                  {isEncryptionEnabled ? (
                    <Badge variant="secondary" className="ml-2">
                      <ShieldCheck className="size-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      Disabled
                    </Badge>
                  )}
                </ItemCardItemTitle>
                <ItemCardItemDescription>
                  {isEncryptionEnabled
                    ? isUnlocked
                      ? 'Your vault is unlocked. Data is being decrypted in your browser.'
                      : 'Your vault is locked. Enter your passphrase to view data.'
                    : 'Enable encryption to protect your financial data at rest.'}
                </ItemCardItemDescription>
              </ItemCardItemContent>
              <ItemCardItemAction>
                {!isEncryptionEnabled && (
                  <Button variant="ghost" onClick={() => setSetupOpen(true)}>
                    <Lock className="size-4" />
                    Enable
                  </Button>
                )}
                {isEncryptionEnabled && isUnlocked && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDisableOpen(true)}
                  >
                    Disable
                  </Button>
                )}
                {isEncryptionEnabled && !isUnlocked && (
                  <Badge variant="outline">
                    <Lock className="size-3" />
                    Locked
                  </Badge>
                )}
              </ItemCardItemAction>
            </ItemCardItem>

            {isEncryptionEnabled && isUnlocked && unencryptedCount > 0 && (
              <ItemCardItem>
                <ItemCardItemContent>
                  <ItemCardItemTitle>Migrate existing data</ItemCardItemTitle>
                  <ItemCardItemDescription>
                    {unencryptedCount} unencrypted{' '}
                    {unencryptedCount === 1 ? 'record' : 'records'} found.
                  </ItemCardItemDescription>
                </ItemCardItemContent>
                <ItemCardItemAction>
                  <Button
                    variant="outline"
                    onClick={() => setMigrateOpen(true)}
                  >
                    Migrate
                  </Button>
                </ItemCardItemAction>
              </ItemCardItem>
            )}
          </ItemCardItems>
        </ItemCard>
      </div>

      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
      {migrateOpen && (
        <MigrateDialog open={migrateOpen} onOpenChange={setMigrateOpen} />
      )}
      {disableOpen && (
        <DisableDialog open={disableOpen} onOpenChange={setDisableOpen} />
      )}
    </div>
  )
}

function SetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const storeKey = useMutation(api.encryptionKeys.storeEncryptionKey)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const valid = passphrase.length >= 8 && passphrase === confirm

  async function handleEnable() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const keyPair = await generateKeyPair()
      const publicKeyJwk = await exportPublicKey(keyPair.publicKey)
      const privateKeyJwk = await exportPrivateKey(keyPair.privateKey)

      const salt = crypto.getRandomValues(new Uint8Array(32))
      const passphraseKey = await deriveKeyFromPassphrase(passphrase, salt)
      const encryptedPk = await encryptPrivateKey(privateKeyJwk, passphraseKey)

      const saltB64 = btoa(String.fromCharCode(...salt))

      await storeKey({
        publicKey: publicKeyJwk,
        encryptedPrivateKey: JSON.stringify(encryptedPk),
        pbkdf2Salt: saltB64,
      })

      // Store private key locally for immediate use
      storePrivateKey(privateKeyJwk)

      toast.success('Encryption enabled')
      onOpenChange(false)
      // Reload to re-initialize encryption context
      window.location.reload()
    } catch (err) {
      toast.error('Failed to enable encryption')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable encryption</DialogTitle>
            <DialogDescription>
              Create a passphrase to protect your financial data. You will need
              this passphrase to unlock your vault on new devices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Passphrase</label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm passphrase</label>
              <Input
                type="password"
                placeholder="Repeat passphrase"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm && passphrase !== confirm && (
                <p className="text-sm text-destructive">
                  Passphrases do not match
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!valid || saving}
            >
              {saving ? 'Setting up...' : 'Enable encryption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Once enabled, all new financial data will be encrypted. If you
              forget your passphrase, your data cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnable}>
              I understand, enable encryption
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MigrateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { privateKey } = useEncryption()
  const { allProfileIds } = useProfile()
  const encryptionKey = useQuery(api.encryptionKeys.getEncryptionKey)

  const allBankAccounts = useQuery(
    api.powens.listAllBankAccounts,
    allProfileIds.length > 0 ? { profileIds: allProfileIds } : 'skip',
  )
  const allSnapshots = useQuery(
    api.balanceSnapshots.listAllSnapshotsByProfiles,
    allProfileIds.length > 0
      ? { profileIds: allProfileIds, startTimestamp: 0 }
      : 'skip',
  )
  const allInvestments = useQuery(
    api.investments.listAllInvestmentsByProfiles,
    allProfileIds.length > 0 ? { profileIds: allProfileIds } : 'skip',
  )

  const migrateAccounts = useMutation(api.encryptionKeys.migrateBankAccount)
  const migrateSnapshot = useMutation(api.encryptionKeys.migrateBalanceSnapshot)
  const migrateInvestment = useMutation(api.encryptionKeys.migrateInvestment)

  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const unencryptedAccounts = allBankAccounts?.filter(
    (a) => !a.encryptedData && (a.balance !== 0 || a.number || a.iban),
  )
  const unencryptedSnapshots = allSnapshots?.filter(
    (s) => !s.encryptedData && s.balance !== 0,
  )
  const unencryptedInvestments = allInvestments?.filter(
    (inv) => !inv.encryptedData && inv.valuation !== 0,
  )

  const totalUnencrypted =
    (unencryptedAccounts?.length ?? 0) +
    (unencryptedSnapshots?.length ?? 0) +
    (unencryptedInvestments?.length ?? 0)

  async function handleMigrate() {
    if (!privateKey || !encryptionKey?.publicKey) return
    setMigrating(true)

    const publicKey = await importPublicKey(encryptionKey.publicKey)
    const total =
      (unencryptedAccounts?.length ?? 0) + (unencryptedSnapshots?.length ?? 0)
    setProgress({ done: 0, total })
    let done = 0

    for (const acct of unencryptedAccounts ?? []) {
      const encrypted = await encryptData(
        {
          number: acct.number,
          iban: acct.iban,
          balance: acct.balance,
        },
        publicKey,
      )
      await migrateAccounts({
        bankAccountId: acct._id,
        encryptedData: encrypted,
      })
      done++
      setProgress({ done, total })
    }

    for (const snap of unencryptedSnapshots ?? []) {
      const encrypted = await encryptData({ balance: snap.balance }, publicKey)
      await migrateSnapshot({
        snapshotId: snap._id,
        encryptedData: encrypted,
      })
      done++
      setProgress({ done, total })
    }

    for (const inv of unencryptedInvestments ?? []) {
      const encrypted = await encryptData(
        {
          label: inv.label,
          description: inv.description,
          quantity: inv.quantity,
          unitprice: inv.unitprice,
          unitvalue: inv.unitvalue,
          valuation: inv.valuation,
          portfolioShare: inv.portfolioShare,
          diff: inv.diff,
          diffPercent: inv.diffPercent,
        },
        publicKey,
      )
      await migrateInvestment({
        investmentId: inv._id,
        encryptedData: encrypted,
      })
      done++
      setProgress({ done, total })
    }

    toast.success('Migration complete')
    setMigrating(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrate existing data</DialogTitle>
          <DialogDescription>
            This will encrypt all existing plaintext financial data. The
            encryption happens in your browser — plaintext values are replaced
            with ciphertext.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-sm">
          {totalUnencrypted === 0 ? (
            <p className="text-muted-foreground">
              All records are already encrypted. Nothing to migrate.
            </p>
          ) : (
            <p>
              <span className="font-medium">{totalUnencrypted}</span> records
              need encryption ({unencryptedAccounts?.length ?? 0} accounts,{' '}
              {unencryptedSnapshots?.length ?? 0} snapshots,{' '}
              {unencryptedInvestments?.length ?? 0} investments).
            </p>
          )}
          {migrating && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.done} / {progress.total}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={migrating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating || totalUnencrypted === 0}
          >
            {migrating ? 'Encrypting...' : 'Start migration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisableDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { privateKey } = useEncryption()
  const { allProfileIds } = useProfile()

  const allBankAccounts = useQuery(
    api.powens.listAllBankAccounts,
    allProfileIds.length > 0 ? { profileIds: allProfileIds } : 'skip',
  )
  const allSnapshots = useQuery(
    api.balanceSnapshots.listAllSnapshotsByProfiles,
    allProfileIds.length > 0
      ? { profileIds: allProfileIds, startTimestamp: 0 }
      : 'skip',
  )
  const allInvestments = useQuery(
    api.investments.listAllInvestmentsByProfiles,
    allProfileIds.length > 0 ? { profileIds: allProfileIds } : 'skip',
  )

  const decryptAccount = useMutation(api.encryptionKeys.decryptBankAccount)
  const decryptSnapshot = useMutation(api.encryptionKeys.decryptBalanceSnapshot)
  const decryptInvestment = useMutation(api.encryptionKeys.decryptInvestment)
  const deleteKey = useMutation(api.encryptionKeys.deleteEncryptionKey)

  const [disabling, setDisabling] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [confirmText, setConfirmText] = useState('')
  const [copied, setCopied] = useState(false)

  const confirmPhrase = 'disable encryption'
  const isConfirmed = confirmText === confirmPhrase

  async function handleCopy() {
    await navigator.clipboard.writeText(confirmPhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const encryptedAccounts = allBankAccounts?.filter((a) => a.encryptedData) ?? []
  const encryptedSnapshots = allSnapshots?.filter((s) => s.encryptedData) ?? []
  const encryptedInvestments =
    allInvestments?.filter((inv) => inv.encryptedData) ?? []

  const totalEncrypted =
    encryptedAccounts.length +
    encryptedSnapshots.length +
    encryptedInvestments.length

  async function handleDisable() {
    if (!privateKey || !isConfirmed) return
    setDisabling(true)

    const total = totalEncrypted
    setProgress({ done: 0, total })
    let done = 0

    for (const acct of encryptedAccounts) {
      const data = await decryptData(acct.encryptedData!, privateKey)
      await decryptAccount({
        bankAccountId: acct._id,
        balance: (data.balance as number) ?? 0,
        number: (data.number as string) ?? undefined,
        iban: (data.iban as string) ?? undefined,
      })
      done++
      setProgress({ done, total })
    }

    for (const snap of encryptedSnapshots) {
      const data = await decryptData(snap.encryptedData!, privateKey)
      await decryptSnapshot({
        snapshotId: snap._id,
        balance: (data.balance as number) ?? 0,
      })
      done++
      setProgress({ done, total })
    }

    for (const inv of encryptedInvestments) {
      const data = await decryptData(inv.encryptedData!, privateKey)
      await decryptInvestment({
        investmentId: inv._id,
        label: (data.label as string) ?? 'Unknown',
        description: (data.description as string) ?? undefined,
        quantity: (data.quantity as number) ?? 0,
        unitprice: (data.unitprice as number) ?? 0,
        unitvalue: (data.unitvalue as number) ?? 0,
        valuation: (data.valuation as number) ?? 0,
        portfolioShare: (data.portfolioShare as number) ?? undefined,
        diff: (data.diff as number) ?? undefined,
        diffPercent: (data.diffPercent as number) ?? undefined,
      })
      done++
      setProgress({ done, total })
    }

    await deleteKey()
    clearStoredPrivateKey()

    toast.success('Encryption disabled')
    setDisabling(false)
    onOpenChange(false)
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable encryption</DialogTitle>
          <DialogDescription>
            Your financial data will no longer be protected by your
            passphrase. Anyone with access to the app will be able to see
            your balances, account numbers, and investment details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {totalEncrypted > 0 && (
            <p className="text-sm">
              <span className="font-medium">{totalEncrypted}</span>{' '}
              {totalEncrypted === 1 ? 'record' : 'records'} will be
              unprotected. This includes your account balances, IBANs, and
              investment holdings.
            </p>
          )}
          <div className="grid gap-2">
            <Label
              htmlFor="disable-confirm"
              className="flex flex-wrap items-center gap-1 text-sm"
            >
              Type
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1 font-mono"
                onClick={handleCopy}
              >
                {confirmPhrase}
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Badge>
              to confirm
            </Label>
            <Input
              id="disable-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              disabled={disabling}
            />
          </div>
          {disabling && (
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
                {progress.done} / {progress.total}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabling}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={!isConfirmed || disabling}
          >
            {disabling ? 'Decrypting...' : 'Disable encryption'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
