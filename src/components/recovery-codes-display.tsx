import { Check, Copy, Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatRecoveryCode } from '~/lib/crypto'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'

interface RecoveryCodesDisplayProps {
  codes: string[]
  onConfirm?: () => void
  confirmLabel?: string
  confirmLoading?: boolean
}

export function RecoveryCodesDisplay({
  codes,
  onConfirm,
  confirmLabel,
  confirmLoading,
}: RecoveryCodesDisplayProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  function buildCodesText() {
    return codes
      .map((code, i) => `${i + 1}. ${formatRecoveryCode(code)}`)
      .join('\n')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCodesText())
    setCopied(true)
    toast.success(t('recoveryCodes.copiedToClipboard'))
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const text = `Bunkr Recovery Codes\n${'='.repeat(30)}\n\n${buildCodesText()}\n\nStore these codes in a safe place.\nEach code can only be used once.\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bunkr-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription>
          {t('recoveryCodes.warningOnlyShownOnce')}
        </AlertDescription>
      </Alert>

      <div className="rounded-md border bg-muted/50 p-4">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {codes.map((code, i) => (
            <div
              key={code}
              className="flex items-center gap-2 font-mono text-sm"
            >
              <span className="w-5 text-right text-muted-foreground">
                {i + 1}.
              </span>
              <span>{formatRecoveryCode(code)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {t('recoveryCodes.copyAll')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" />
          {t('recoveryCodes.download')}
        </Button>
      </div>

      {onConfirm && (
        <Button onClick={onConfirm} loading={confirmLoading}>
          {confirmLabel ?? t('recoveryCodes.iveSavedMyCodes')}
        </Button>
      )}
    </div>
  )
}
