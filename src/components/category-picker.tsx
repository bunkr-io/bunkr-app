import { useMutation } from 'convex/react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import {
  CreateCategoryDialog,
  useCreateCategoryDialog,
} from '~/components/create-category-dialog'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { useEncryption } from '~/contexts/encryption-context'
import { usePortfolio } from '~/contexts/portfolio-context'
import { useCategories } from '~/lib/categories'
import { encryptData, importPublicKey } from '~/lib/crypto'
import { cn } from '~/lib/utils'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

interface CategoryPickerProps {
  transactionId: string
  currentCategoryKey: string
  wording: string
  onCreateRule?: (wording: string, categoryKey: string) => void
}

export function CategoryPicker({
  transactionId,
  currentCategoryKey,
  wording,
  onCreateRule,
}: CategoryPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const { categories, getCategory } = useCategories()
  const { workspacePublicKey } = useEncryption()
  const { singlePortfolioId } = usePortfolio()
  const updateCategory = useMutation(api.transactions.updateTransactionCategory)

  const current = getCategory(currentCategoryKey)

  const builtInCategories = categories.filter((c) => c.builtIn)
  const customCategories = categories.filter((c) => !c.builtIn)

  const exactMatch = categories.some(
    (c) => c.label.toLowerCase() === search.trim().toLowerCase(),
  )

  const createDialog = useCreateCategoryDialog(
    customCategories.length,
    singlePortfolioId,
  )

  const handleSelect = async (categoryKey: string, categoryLabel?: string) => {
    setOpen(false)
    setSearch('')
    if (categoryKey === currentCategoryKey) return

    try {
      if (!workspacePublicKey) throw new Error('Vault not unlocked')
      const pubKey = await importPublicKey(workspacePublicKey)
      const encryptedCategories = await encryptData(
        {
          category: categoryKey,
          categoryParent: undefined,
          userCategoryKey: categoryKey,
        },
        pubKey,
        transactionId,
        'encryptedCategories',
      )
      await updateCategory({
        transactionId: transactionId as Id<'transactions'>,
        encryptedCategories,
      })
      const label = categoryLabel ?? getCategory(categoryKey).label
      toast.success('Category updated', {
        description: `Changed to "${label}"`,
        action: onCreateRule
          ? {
              label: 'Create rule',
              onClick: () => onCreateRule(wording, categoryKey),
            }
          : undefined,
      })
    } catch {
      toast.error('Failed to update category')
    }
  }

  const handleCreateClick = () => {
    const name = search.trim()
    if (!name) return
    setOpen(false)
    setSearch('')
    createDialog.openDialog(name)
  }

  const handleCreated = (categoryKey: string, categoryLabel: string) => {
    handleSelect(categoryKey, categoryLabel)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="h-auto justify-start gap-2 px-2 py-1 font-normal"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: current.color }}
            />
            <span className="truncate text-muted-foreground">
              {current.label}
            </span>
            <ChevronsUpDown className="ml-auto size-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create category..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {search.trim() ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={handleCreateClick}
                  >
                    <Plus className="size-3" />
                    Create &ldquo;{search.trim()}&rdquo;
                  </button>
                ) : (
                  'No category found.'
                )}
              </CommandEmpty>
              <CommandGroup heading="Categories">
                {builtInCategories.map((cat) => (
                  <CommandItem
                    key={cat.key}
                    value={cat.label}
                    onSelect={() => handleSelect(cat.key)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                    <Check
                      className={cn(
                        'ml-auto size-3',
                        currentCategoryKey === cat.key
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              {customCategories.length > 0 && (
                <CommandGroup heading="Custom">
                  {customCategories.map((cat) => (
                    <CommandItem
                      key={cat.key}
                      value={cat.label}
                      onSelect={() => handleSelect(cat.key)}
                      className={cat.parentKey ? 'pl-6' : undefined}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.label}</span>
                      <Check
                        className={cn(
                          'ml-auto size-3',
                          currentCategoryKey === cat.key
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {search.trim() && !exactMatch && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreateClick}>
                    <Plus className="size-3" />
                    Create &ldquo;{search.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateCategoryDialog
        open={createDialog.dialogOpen}
        onOpenChange={createDialog.setDialogOpen}
        initialName={createDialog.initialName}
        initialColor={createDialog.initialColor}
        defaultPortfolioId={createDialog.defaultPortfolioId}
        onCreated={handleCreated}
      />
    </>
  )
}
