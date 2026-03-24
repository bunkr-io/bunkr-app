import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from 'convex/react'
import { Lock, MoreHorizontal, Plus } from 'lucide-react'
import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { DataTable } from '~/components/data-table'
import { Button } from '~/components/ui/button'
import { ColorPicker } from '~/components/ui/color-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { HotkeyDisplay, Kbd } from '~/components/ui/kbd'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute(
  '/_settings/settings/portfolios/$id/labels',
)({
  component: PortfolioLabelsPage,
})

type LabelRow = {
  _id: string
  name: string
  description?: string
  color: string
  portfolioId?: string
  createdAt: number
}

function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function PortfolioLabelsPage() {
  const { id } = Route.useParams()
  const portfolioId = id as Id<'portfolios'>
  const portfolio = useQuery(api.portfolios.getPortfolio, { portfolioId })
  const workspace = useQuery(api.workspaces.getMyWorkspace)
  const allLabels = useQuery(
    api.transactionLabels.listLabels,
    workspace ? { workspaceId: workspace._id, portfolioId } : 'skip',
  )

  if (
    portfolio === undefined ||
    workspace === undefined ||
    allLabels === undefined
  ) {
    return (
      <div className="w-full flex-1 px-10 py-16">
        <Skeleton className="h-9 w-32" />
        <div className="mt-8">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!portfolio || !workspace) return null

  return (
    <div className="flex w-full flex-1 flex-col px-10 py-16">
      <header>
        <h1 className="text-3xl font-semibold">Labels</h1>
      </header>
      <div className="mt-8">
        <LabelsTable
          labels={allLabels as LabelRow[]}
          portfolioId={portfolioId}
          workspaceId={workspace._id}
        />
      </div>
    </div>
  )
}

function LabelsTable({
  labels,
  portfolioId,
  workspaceId,
}: {
  labels: LabelRow[]
  portfolioId: Id<'portfolios'>
  workspaceId: Id<'workspaces'>
}) {
  const createLabel = useMutation(api.transactionLabels.createLabel)
  const updateLabel = useMutation(api.transactionLabels.updateLabel)
  const deleteLabel = useMutation(api.transactionLabels.deleteLabel)
  const batchDeleteLabels = useMutation(api.transactionLabels.batchDeleteLabels)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingLabel, setEditingLabel] = React.useState<LabelRow | null>(null)
  const [newName, setNewName] = React.useState('')
  const [newDescription, setNewDescription] = React.useState('')
  const [newColor, setNewColor] = React.useState('#3B82F6')
  const [saving, setSaving] = React.useState(false)
  const [deletingLabelId, setDeletingLabelId] =
    React.useState<Id<'transactionLabels'> | null>(null)

  const isPortfolioLevel = (row: LabelRow) => row.portfolioId === portfolioId

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await createLabel({
        workspaceId,
        portfolioId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      })
      toast.success('Label created')
      setCreateOpen(false)
      setNewName('')
      setNewDescription('')
      setNewColor('#3B82F6')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create label')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingLabel || !newName.trim()) return
    setSaving(true)
    try {
      await updateLabel({
        labelId: editingLabel._id as Id<'transactionLabels'>,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      })
      toast.success('Label updated')
      setEditingLabel(null)
      setNewName('')
      setNewDescription('')
      setNewColor('#3B82F6')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update label')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingLabelId) return
    try {
      await deleteLabel({ labelId: deletingLabelId })
      toast.success('Label deleted')
      setDeletingLabelId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete label')
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await batchDeleteLabels({
        labelIds: ids as Id<'transactionLabels'>[],
      })
      toast.success(`${ids.length} label${ids.length > 1 ? 's' : ''} deleted`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete labels',
      )
    }
  }

  const openEdit = (label: LabelRow) => {
    setEditingLabel(label)
    setNewName(label.name)
    setNewDescription(label.description ?? '')
    setNewColor(label.color)
  }

  const tableColumns: ColumnDef<LabelRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.original.color }}
          />
          <span className="font-medium">{row.original.name}</span>
          {!isPortfolioLevel(row.original) && (
            <Lock className="size-3 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description}
        </span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      size: 100,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatShortDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      size: 50,
      cell: ({ row }) => {
        if (!isPortfolioLevel(row.original)) return null
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(row.original)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    setDeletingLabelId(
                      row.original._id as Id<'transactionLabels'>,
                    )
                  }
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={tableColumns}
        data={labels}
        filterColumn="name"
        filterPlaceholder="Filter by name..."
        getRowId={(row) => row._id}
        onBatchDelete={handleBatchDelete}
        enableRowSelection={(row) => isPortfolioLevel(row)}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add label
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Add Label</DialogTitle>
            <DialogDescription>
              Create a label for this portfolio.
            </DialogDescription>
          </DialogHeader>
          <LabelFormFields
            name={newName}
            description={newDescription}
            color={newColor}
            onNameChange={setNewName}
            onDescriptionChange={setNewDescription}
            onColorChange={setNewColor}
          />
          <LabelFormFooter
            onCancel={() => setCreateOpen(false)}
            onConfirm={handleCreate}
            disabled={saving || !newName.trim()}
            saving={saving}
            confirmLabel="Create"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingLabel !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLabel(null)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
            <DialogDescription>
              Update label name, description or color.
            </DialogDescription>
          </DialogHeader>
          <LabelFormFields
            name={newName}
            description={newDescription}
            color={newColor}
            onNameChange={setNewName}
            onDescriptionChange={setNewDescription}
            onColorChange={setNewColor}
          />
          <LabelFormFooter
            onCancel={() => setEditingLabel(null)}
            onConfirm={handleUpdate}
            disabled={saving || !newName.trim()}
            saving={saving}
            confirmLabel="Save"
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingLabelId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLabelId(null)
        }}
        title="Delete label?"
        description="This action cannot be undone. This label will be removed from all transactions that use it."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  )
}

function LabelFormFields({
  name,
  description,
  color,
  onNameChange,
  onDescriptionChange,
  onColorChange,
}: {
  name: string
  description: string
  color: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label-name" className="flex items-center">
          Name
          <span className="ml-auto font-normal text-muted-foreground">
            Required
          </span>
        </Label>
        <Input
          id="label-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Urgent"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="label-description">Description</Label>
        <Textarea
          id="label-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. Mark transactions that need attention"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker color={color} onChange={onColorChange} />
      </div>
    </div>
  )
}

function LabelFormFooter({
  onCancel,
  onConfirm,
  disabled,
  saving,
  confirmLabel,
}: {
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
  saving: boolean
  confirmLabel: string
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
        {confirmLabel} <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
      </Button>
    </DialogFooter>
  )
}
