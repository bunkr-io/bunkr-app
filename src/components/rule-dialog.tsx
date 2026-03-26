import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { DialogFormFooter } from '~/components/dialog-form-footer'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Switch } from '~/components/ui/switch'
import { useRetroactiveRuleApplication } from '~/hooks/use-retroactive-rule-application'
import { useCategories } from '~/lib/categories'
import { cn } from '~/lib/utils'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'

interface RuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: Doc<'transactionRules'>
  defaultPattern?: string
  defaultCategoryKey?: string
  defaultExcludeFromBudget?: boolean
}

export function RuleDialog({
  open,
  onOpenChange,
  rule,
  defaultPattern = '',
  defaultCategoryKey = '',
  defaultExcludeFromBudget = false,
}: RuleDialogProps) {
  const isEdit = !!rule
  const [pattern, setPattern] = React.useState(defaultPattern)
  const [matchType, setMatchType] = React.useState<'contains' | 'regex'>(
    'contains',
  )
  const [categoryKey, setCategoryKey] = React.useState(defaultCategoryKey)
  const [excludeFromBudget, setExcludeFromBudget] = React.useState(
    defaultExcludeFromBudget,
  )
  const [selectedLabelIds, setSelectedLabelIds] = React.useState<string[]>([])
  const [applyRetroactively, setApplyRetroactively] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const { categories } = useCategories()
  const workspace = useQuery(api.workspaces.getMyWorkspace)
  const labels = useQuery(
    api.transactionLabels.listWorkspaceLabels,
    workspace ? { workspaceId: workspace._id } : 'skip',
  )
  const createRule = useMutation(api.transactionRules.createRule)
  const updateRule = useMutation(api.transactionRules.updateRule)
  const { apply } = useRetroactiveRuleApplication()

  React.useEffect(() => {
    if (open) {
      if (rule) {
        setPattern(rule.pattern)
        setMatchType(rule.matchType)
        setCategoryKey(rule.categoryKey ?? '')
        setExcludeFromBudget(rule.excludeFromBudget ?? false)
        setSelectedLabelIds((rule.labelIds as string[] | undefined) ?? [])
        setApplyRetroactively(true)
      } else {
        setPattern(defaultPattern)
        setMatchType('contains')
        setCategoryKey(defaultCategoryKey)
        setExcludeFromBudget(defaultExcludeFromBudget)
        setSelectedLabelIds([])
        setApplyRetroactively(true)
      }
    }
  }, [open, rule, defaultPattern, defaultCategoryKey, defaultExcludeFromBudget])

  const hasAction =
    !!categoryKey || excludeFromBudget || selectedLabelIds.length > 0

  const handleSave = async () => {
    if (!pattern.trim() || !hasAction) return
    setSaving(true)
    try {
      if (isEdit) {
        await updateRule({
          ruleId: rule._id,
          pattern: pattern.trim(),
          matchType,
          categoryKey: categoryKey || '',
          excludeFromBudget,
          labelIds: selectedLabelIds as Array<Id<'transactionLabels'>>,
        })
        toast.success('Rule updated')
      } else {
        await createRule({
          pattern: pattern.trim(),
          matchType,
          categoryKey: categoryKey || undefined,
          excludeFromBudget: excludeFromBudget || undefined,
          labelIds:
            selectedLabelIds.length > 0
              ? (selectedLabelIds as Array<Id<'transactionLabels'>>)
              : undefined,
        })
        toast.success('Rule created', {
          description: applyRetroactively
            ? 'Existing transactions are being updated.'
            : 'New transactions will be processed automatically.',
        })

        if (applyRetroactively) {
          apply({
            pattern: pattern.trim(),
            matchType,
            categoryKey: categoryKey || undefined,
            excludeFromBudget: excludeFromBudget || undefined,
            labelIds:
              selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
          })
        }
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? 'Failed to update rule' : 'Failed to create rule')
    } finally {
      setSaving(false)
    }
  }

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    )
  }

  const selectedCategory = categoryKey
    ? categories.find((c) => c.key === categoryKey)
    : undefined

  const selectedLabels = (labels ?? []).filter((l) =>
    selectedLabelIds.includes(l._id),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Condition: "When a transaction [contains ▾] [pattern]" */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                When a transaction
              </span>
              <MatchTypePicker matchType={matchType} onChange={setMatchType} />
            </div>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={
                matchType === 'regex'
                  ? 'e.g. CARREFOUR|LECLERC'
                  : 'e.g. CARREFOUR'
              }
              className="font-mono"
              autoFocus
            />
          </div>

          {/* Actions: "then assign ..., add ..., exclude from budget" */}
          <div className="space-y-3">
            <span className="text-sm text-muted-foreground">then</span>

            {/* Assign category */}
            <ActionRow
              label="assign"
              active={!!categoryKey}
              onClear={() => setCategoryKey('')}
            >
              <CategorySelect
                categories={categories}
                categoryKey={categoryKey}
                selectedCategory={selectedCategory}
                onChange={setCategoryKey}
              />
            </ActionRow>

            {/* Add labels */}
            {labels && labels.length > 0 && (
              <ActionRow
                label="add"
                active={selectedLabelIds.length > 0}
                onClear={() => setSelectedLabelIds([])}
              >
                <LabelMultiSelect
                  labels={labels}
                  selectedLabelIds={selectedLabelIds}
                  selectedLabels={selectedLabels}
                  onToggle={toggleLabel}
                />
              </ActionRow>
            )}

            {/* Exclude from budget */}
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <span className="text-sm text-muted-foreground">
                exclude from
              </span>
              <span className="text-sm">budget</span>
              <Switch
                checked={excludeFromBudget}
                onCheckedChange={setExcludeFromBudget}
                className="ml-auto"
              />
            </div>
          </div>

          {/* Apply retroactively */}
          {!isEdit && (
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
          )}
        </div>

        <DialogFormFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={handleSave}
          disabled={saving || !pattern.trim() || !hasAction}
          saving={saving}
          confirmLabel={isEdit ? 'Save rule' : 'Create rule'}
        />
      </DialogContent>
    </Dialog>
  )
}

function MatchTypePicker({
  matchType,
  onChange,
}: {
  matchType: 'contains' | 'regex'
  onChange: (v: 'contains' | 'regex') => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-sm font-medium transition-colors hover:bg-accent"
        >
          {matchType === 'contains' ? 'contains' : 'matches'}
          <ChevronsUpDown className="size-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[140px] p-1" align="start">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent',
            matchType === 'contains' && 'font-medium',
          )}
          onClick={() => {
            onChange('contains')
            setOpen(false)
          }}
        >
          contains
        </button>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent',
            matchType === 'regex' && 'font-medium',
          )}
          onClick={() => {
            onChange('regex')
            setOpen(false)
          }}
        >
          matches (regex)
        </button>
      </PopoverContent>
    </Popover>
  )
}

function ActionRow({
  label,
  active,
  onClear,
  children,
}: {
  label: string
  active: boolean
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {active && (
        <button
          type="button"
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onClear}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function CategorySelect({
  categories,
  categoryKey,
  selectedCategory,
  onChange,
}: {
  categories: Array<{
    key: string
    label: string
    color: string
    builtIn?: boolean
  }>
  categoryKey: string
  selectedCategory: { key: string; label: string; color: string } | undefined
  onChange: (key: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  const builtIn = categories.filter((c) => c.builtIn)
  const custom = categories.filter((c) => !c.builtIn)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-md text-sm transition-colors hover:opacity-80"
        >
          {selectedCategory ? (
            <>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selectedCategory.color }}
              />
              <span className="truncate">{selectedCategory.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">category...</span>
          )}
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup heading="Categories">
              {builtIn.map((cat) => (
                <CommandItem
                  key={cat.key}
                  value={cat.label}
                  onSelect={() => {
                    onChange(cat.key)
                    setOpen(false)
                  }}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.label}</span>
                  <Check
                    className={cn(
                      'ml-auto size-3',
                      categoryKey === cat.key ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {custom.length > 0 && (
              <CommandGroup heading="Custom">
                {custom.map((cat) => (
                  <CommandItem
                    key={cat.key}
                    value={cat.label}
                    onSelect={() => {
                      onChange(cat.key)
                      setOpen(false)
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                    <Check
                      className={cn(
                        'ml-auto size-3',
                        categoryKey === cat.key ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function LabelMultiSelect({
  labels,
  selectedLabelIds,
  selectedLabels,
  onToggle,
}: {
  labels: Array<Doc<'transactionLabels'>>
  selectedLabelIds: string[]
  selectedLabels: Array<Doc<'transactionLabels'>>
  onToggle: (labelId: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-md text-sm transition-colors hover:opacity-80"
        >
          {selectedLabels.length > 0 ? (
            <span className="flex min-w-0 flex-wrap gap-1">
              {selectedLabels.map((label) => (
                <Badge
                  key={label._id}
                  variant="secondary"
                  className="gap-1 px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    borderColor: `${label.color}40`,
                  }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">labels...</span>
          )}
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label._id}
                  value={label.name}
                  onSelect={() => onToggle(label._id)}
                >
                  <Checkbox
                    checked={selectedLabelIds.includes(label._id)}
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span>{label.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
