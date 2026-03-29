import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
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
import { RequireOwner } from '~/components/require-owner'
import { PageHeader } from '~/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute(
  '/_settings/settings/workspace/permissions',
)({
  component: PermissionsPage,
})

function PermissionsPage() {
  return (
    <RequireOwner>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-10 py-16">
        <div className="shrink-0">
          <PageHeader
            title="Permissions"
            description="Control who can create workspace-level resources."
          />
        </div>
        <div className="mt-8 space-y-6">
          <PermissionsSettings />
        </div>
      </div>
    </RequireOwner>
  )
}

function PermissionsSettings() {
  const workspace = useQuery(api.workspaces.getMyWorkspace)
  const updatePolicies = useMutation(api.workspaces.updateWorkspacePolicies)

  if (workspace === undefined) {
    return <Skeleton className="h-48 w-full rounded-lg" />
  }

  if (!workspace) return null

  const categoryCreation = workspace.policies?.categoryCreation ?? 'owners_only'
  const labelCreation = workspace.policies?.labelCreation ?? 'owners_only'
  const ruleCreation = workspace.policies?.ruleCreation ?? 'owners_only'

  const handleChange = async (
    field: 'categoryCreation' | 'labelCreation' | 'ruleCreation',
    value: 'owners_only' | 'all_members',
  ) => {
    try {
      await updatePolicies({
        categoryCreation:
          field === 'categoryCreation' ? value : categoryCreation,
        labelCreation: field === 'labelCreation' ? value : labelCreation,
        ruleCreation: field === 'ruleCreation' ? value : ruleCreation,
      })
      toast.success('Permissions updated')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update permissions',
      )
    }
  }

  return (
    <ItemCard>
      <ItemCardItems>
        <ItemCardItem>
          <ItemCardItemContent>
            <ItemCardItemTitle>Category creation</ItemCardItemTitle>
            <ItemCardItemDescription>
              Who can create new categories assigned to the workspace
            </ItemCardItemDescription>
          </ItemCardItemContent>
          <ItemCardItemAction>
            <Select
              value={categoryCreation}
              onValueChange={(v) =>
                handleChange(
                  'categoryCreation',
                  v as 'owners_only' | 'all_members',
                )
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owners_only">Owners only</SelectItem>
                <SelectItem value="all_members">All members</SelectItem>
              </SelectContent>
            </Select>
          </ItemCardItemAction>
        </ItemCardItem>
        <ItemCardItem>
          <ItemCardItemContent>
            <ItemCardItemTitle>Label creation</ItemCardItemTitle>
            <ItemCardItemDescription>
              Who can create new labels assigned to the workspace
            </ItemCardItemDescription>
          </ItemCardItemContent>
          <ItemCardItemAction>
            <Select
              value={labelCreation}
              onValueChange={(v) =>
                handleChange(
                  'labelCreation',
                  v as 'owners_only' | 'all_members',
                )
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owners_only">Owners only</SelectItem>
                <SelectItem value="all_members">All members</SelectItem>
              </SelectContent>
            </Select>
          </ItemCardItemAction>
        </ItemCardItem>
        <ItemCardItem>
          <ItemCardItemContent>
            <ItemCardItemTitle>Automation rules</ItemCardItemTitle>
            <ItemCardItemDescription>
              Who can create new transaction automation rules for the workspace
            </ItemCardItemDescription>
          </ItemCardItemContent>
          <ItemCardItemAction>
            <Select
              value={ruleCreation}
              onValueChange={(v) =>
                handleChange('ruleCreation', v as 'owners_only' | 'all_members')
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owners_only">Owners only</SelectItem>
                <SelectItem value="all_members">All members</SelectItem>
              </SelectContent>
            </Select>
          </ItemCardItemAction>
        </ItemCardItem>
      </ItemCardItems>
    </ItemCard>
  )
}
