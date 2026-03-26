import { useMutation } from 'convex/react'
import { ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import { CategoryCombobox } from '~/components/category-combobox'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
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
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { useRetroactiveRuleApplication } from '~/hooks/use-retroactive-rule-application'
import { cn } from '~/lib/utils'
import { api } from '../../convex/_generated/api'

interface CreateRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPattern?: string
  defaultCategoryKey?: string
  defaultExcludeFromBudget?: boolean
}

export function CreateRuleDialog({
  open,
  onOpenChange,
  defaultPattern = '',
  defaultCategoryKey = '',
  defaultExcludeFromBudget = false,
}: CreateRuleDialogProps) {
  const [pattern, setPattern] = React.useState(defaultPattern)
  const [categoryKey, setCategoryKey] = React.useState(defaultCategoryKey)
  const [excludeFromBudget, setExcludeFromBudget] = React.useState(
    defaultExcludeFromBudget,
  )
  const [applyRetroactively, setApplyRetroactively] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const createRule = useMutation(api.transactionRules.createRule)
  const { apply } = useRetroactiveRuleApplication()

  React.useEffect(() => {
    if (open) {
      setPattern(defaultPattern)
      setCategoryKey(defaultCategoryKey)
      setExcludeFromBudget(defaultExcludeFromBudget)
      setApplyRetroactively(true)
    }
  }, [open, defaultPattern, defaultCategoryKey, defaultExcludeFromBudget])

  const hasAction = !!categoryKey || excludeFromBudget

  const handleSave = async () => {
    if (!pattern.trim() || !hasAction) return
    setSaving(true)
    try {
      await createRule({
        pattern: pattern.trim(),
        matchType: 'contains',
        categoryKey: categoryKey || undefined,
        excludeFromBudget: excludeFromBudget || undefined,
      })
      toast.success('Rule created', {
        description: applyRetroactively
          ? 'Existing transactions are being updated.'
          : 'New transactions will be processed automatically.',
      })
      onOpenChange(false)

      if (applyRetroactively) {
        apply({
          pattern: pattern.trim(),
          matchType: 'contains',
          categoryKey: categoryKey || undefined,
          excludeFromBudget: excludeFromBudget || undefined,
        })
      }
    } catch {
      toast.error('Failed to create rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
          <DialogDescription>
            Transactions whose description contains this text will be
            automatically processed with the selected actions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Description contains</Label>
            <Input
              id="pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. CARREFOUR"
            />
            <p className={cn('text-xs text-muted-foreground')}>
              Case-insensitive. Matches any part of the transaction description.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Assign category</Label>
            <CategoryCombobox
              value={categoryKey}
              onChange={(key) => setCategoryKey(key)}
              allowCreate
              trigger={({ category, open }) => (
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between font-normal"
                >
                  {categoryKey ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      No category (optional)
                    </span>
                  )}
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                </Button>
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="exclude-budget" className="font-normal">
              Exclude from budget
            </Label>
            <Switch
              id="exclude-budget"
              checked={excludeFromBudget}
              onCheckedChange={setExcludeFromBudget}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="apply-retroactively"
              checked={applyRetroactively}
              onCheckedChange={(checked) =>
                setApplyRetroactively(checked === true)
              }
            />
            <Label htmlFor="apply-retroactively" className="font-normal">
              Apply to existing transactions
            </Label>
          </div>
        </div>
        <CreateRuleFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={handleSave}
          disabled={saving || !pattern.trim() || !hasAction}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  )
}

function CreateRuleFooter({
  onCancel,
  onConfirm,
  disabled,
  saving,
}: {
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
  saving: boolean
}) {
  const handleConfirm = React.useCallback(() => {
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
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Cancel <Kbd>Esc</Kbd>
      </Button>
      <Button onClick={handleConfirm} disabled={disabled} loading={saving}>
        Create rule <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
      </Button>
    </DialogFooter>
  )
}
