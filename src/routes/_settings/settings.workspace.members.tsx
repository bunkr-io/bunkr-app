import * as Sentry from '@sentry/tanstackstart-react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Bot, Ellipsis, Mail, UserX, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import { ActivateAgentDialog } from '~/components/activate-agent-dialog'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { DataTable, type DataTableGroup } from '~/components/data-table'
import { PassphraseDialog } from '~/components/passphrase-dialog'
import { RequireOwner } from '~/components/require-owner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { HotkeyDisplay, Kbd } from '~/components/ui/kbd'
import { PageHeader } from '~/components/ui/page-header'
import { Skeleton } from '~/components/ui/skeleton'
import { useEncryption } from '~/contexts/encryption-context'
import { encryptString, importPublicKey } from '~/lib/crypto'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/_settings/settings/workspace/members')({
  component: MembersPage,
})

type ResolvedUser = {
  firstName: string | null
  lastName: string | null
  imageUrl: string
  email: string
}

type MemberRow = {
  _id: string
  type: 'human' | 'invitation' | 'agent'
  userId: string
  name: string
  email: string
  imageUrl?: string
  role: 'owner' | 'member' | 'agent'
  encStatus?: {
    hasPersonalKey: boolean
    hasKeySlot: boolean
    publicKey: string | null
  }
  isCurrentUser: boolean
}

function MembersPage() {
  const data = useQuery(api.members.listMembers)
  const subscription = useQuery(api.billing.getSubscriptionStatus)
  const agentStatus = useQuery(api.agent.getAgentStatus)
  const resolveUsers = useAction(api.members.resolveUsers)
  const [users, setUsers] = useState<Record<string, ResolvedUser>>({})
  const [usersLoading, setUsersLoading] = useState(true)

  const { isEncryptionEnabled, role } = useEncryption()
  const membersStatus = useQuery(
    api.encryptionKeys.listMembersEncryptionStatus,
    isEncryptionEnabled ? {} : 'skip',
  )

  const fetchUsers = useCallback(async () => {
    if (!data?.members.length) return
    const userIds = data.members.map((m) => m.userId)
    setUsersLoading(true)
    try {
      const resolved = await resolveUsers({ userIds })
      setUsers(resolved)
    } catch {
      // Clerk API may not be configured yet
    } finally {
      setUsersLoading(false)
    }
  }, [data?.members, resolveUsers])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (data === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-10 py-16">
        <header>
          <Skeleton className="h-9 w-32" />
        </header>
        <div className="mt-8 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const encryptionStatusMap = new Map(
    membersStatus?.map((m) => [m.userId, m]) ?? [],
  )

  const isOwner = role === 'owner'

  // Build unified rows
  const rows: MemberRow[] = []

  if (!usersLoading) {
    for (const member of data.members) {
      const user = users[member.userId] as ResolvedUser | undefined
      const name = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ')
        : member.userId
      const encStatus = encryptionStatusMap.get(member.userId)

      rows.push({
        _id: member._id,
        type: 'human',
        userId: member.userId,
        name,
        email: user?.email ?? '',
        imageUrl: user?.imageUrl,
        role: member.role,
        encStatus: encStatus
          ? {
              hasPersonalKey: encStatus.hasPersonalKey,
              hasKeySlot: encStatus.hasKeySlot,
              publicKey: encStatus.publicKey,
            }
          : undefined,
        isCurrentUser: member.userId === data.currentUserId,
      })
    }

    for (const invitation of data.invitations) {
      rows.push({
        _id: invitation._id,
        type: 'invitation',
        userId: '',
        name: invitation.email,
        email: 'Pending invitation',
        role: 'member',
        isCurrentUser: false,
      })
    }
  }

  // Add agent row if enabled
  if (agentStatus?.enabled) {
    rows.push({
      _id: 'bunkr-agent',
      type: 'agent',
      userId: 'bunkr-agent',
      name: 'Bunkr Agent',
      email: 'AI assistant with access to your financial data',
      role: 'agent',
      isCurrentUser: false,
    })
  }

  const groups: DataTableGroup<MemberRow>[] = [
    {
      label: 'Members',
      filter: (row) => row.type === 'human' || row.type === 'invitation',
    },
    {
      label: 'Applications',
      filter: (row) => row.type === 'agent',
      action:
        isOwner && !agentStatus?.enabled ? <ActivateAgentButton /> : undefined,
    },
  ]

  return (
    <RequireOwner>
      <div className="flex h-full flex-col overflow-hidden px-10 pt-16">
        <div className="shrink-0">
          <PageHeader
            title="Members"
            description="Invite and manage who has access to this workspace."
          />
        </div>
        <div className="mt-8 flex min-h-0 flex-1 flex-col">
          {usersLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (
            <DataTable
              columns={memberColumns}
              data={rows}
              filterColumn="name"
              filterPlaceholder="Filter by name..."
              getRowId={(row) => row._id}
              groups={groups}
              actions={
                isOwner ? (
                  <InviteDialog
                    existingEmails={[
                      ...Object.values(users)
                        .map((u) => u.email.toLowerCase())
                        .filter(Boolean),
                      ...data.invitations.map((i) => i.email.toLowerCase()),
                    ]}
                    atSeatLimit={
                      subscription?.isActive
                        ? subscription.currentSeats +
                            subscription.pendingInvitations >=
                          subscription.seats
                        : false
                    }
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    </RequireOwner>
  )
}

// --- Column definitions ---

const memberColumns: ColumnDef<MemberRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const { type, name, imageUrl, isCurrentUser } = row.original

      if (type === 'agent') {
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="size-4 text-primary" />
            </div>
            <span className="font-medium">{name}</span>
          </div>
        )
      }

      if (type === 'invitation') {
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 rounded-full">
              <AvatarFallback className="rounded-full text-xs">
                <Mail className="size-4" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        )
      }

      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback className="rounded-full text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {name}
            {isCurrentUser && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                (you)
              </span>
            )}
          </span>
        </div>
      )
    },
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    id: 'status',
    header: '',
    size: 180,
    cell: ({ row }) => <MemberStatusCell row={row.original} />,
  },
  {
    id: 'actions',
    header: '',
    size: 50,
    cell: ({ row }) => <MemberActionsCell row={row.original} />,
  },
]

function MemberStatusCell({ row }: { row: MemberRow }) {
  const { isEncryptionEnabled, role } = useEncryption()
  const isOwner = role === 'owner'

  if (row.type === 'agent') {
    return <Badge variant="secondary">Active</Badge>
  }

  if (row.type === 'invitation') {
    return <Badge variant="outline">Invited</Badge>
  }

  if (!isEncryptionEnabled || !row.encStatus) return null

  const { hasKeySlot, hasPersonalKey, publicKey } = row.encStatus

  if (hasKeySlot) return null // Has access, no badge needed

  if (hasPersonalKey && isOwner && publicKey) {
    return (
      <GrantAccessButton
        targetUserId={row.userId}
        targetPublicKey={publicKey}
      />
    )
  }

  if (hasPersonalKey) {
    return <Badge variant="outline">Pending access</Badge>
  }

  return (
    <Badge variant="outline">
      <UserX className="size-3" />
      Pending setup
    </Badge>
  )
}

function MemberActionsCell({ row }: { row: MemberRow }) {
  const { role } = useEncryption()
  const isOwner = role === 'owner'

  if (row.type === 'agent' && isOwner) {
    return <DeactivateAgentMenu />
  }

  if (row.type === 'invitation') {
    return <RevokeInvitationButton invitationId={row._id} />
  }

  if (row.type === 'human' && isOwner && !row.isCurrentUser) {
    return <RemoveMemberMenu memberId={row._id} memberName={row.name} />
  }

  return null
}

// --- Activate Agent Button (for Applications group action) ---

function ActivateAgentButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Activate
      </Button>
      <ActivateAgentDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

// --- Deactivate Agent Menu ---

function DeactivateAgentMenu() {
  const deactivateAgent = useMutation(api.agent.deactivateAgent)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      await deactivateAgent()
      toast.success('Bunkr Agent deactivated')
      setConfirmOpen(false)
    } catch {
      toast.error('Failed to deactivate agent')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Deactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Deactivate Bunkr Agent"
        description="This will revoke the agent's access to your financial data and delete all agent conversations. This action cannot be undone."
        confirmValue="Bunkr Agent"
        confirmLabel="Deactivate"
        loading={deactivating}
        onConfirm={handleDeactivate}
      />
    </>
  )
}

// --- Remove Member Menu ---

function RemoveMemberMenu({
  memberId,
  memberName,
}: {
  memberId: string
  memberName: string
}) {
  const removeMember = useAction(api.members.removeMember)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      await removeMember({ memberId: memberId as never })
      toast.success('Member removed')
      setConfirmOpen(false)
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Remove member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove member"
        description={`Are you sure you want to remove ${memberName} from this workspace? They will lose access to all shared data.`}
        confirmValue={memberName}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={handleRemove}
      />
    </>
  )
}

// --- Revoke Invitation Button ---

function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const revokeInvitation = useAction(api.members.revokeInvitationAction)
  const [revoking, setRevoking] = useState(false)

  async function handleRevoke() {
    setRevoking(true)
    try {
      await revokeInvitation({
        invitationId: invitationId as never,
      })
      toast.success('Invitation revoked')
    } catch (error) {
      Sentry.captureException(error)
      toast.error('Failed to revoke invitation')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRevoke}
      disabled={revoking}
    >
      Revoke
    </Button>
  )
}

// --- Grant Access Button ---

function GrantAccessButton({
  targetUserId,
  targetPublicKey,
}: {
  targetUserId: string
  targetPublicKey: string
}) {
  const { workspacePrivateKeyJwk, unlock } = useEncryption()
  const grantAccess = useMutation(api.encryptionKeys.grantMemberAccess)
  const [granting, setGranting] = useState(false)
  const [passphraseOpen, setPassphraseOpen] = useState(false)
  const [pendingGrant, setPendingGrant] = useState(false)

  async function doGrantAccess(wsPrivateKeyJwk: string) {
    setGranting(true)
    try {
      const recipientPubKey = await importPublicKey(targetPublicKey)
      const encryptedWsPrivateKey = await encryptString(
        wsPrivateKeyJwk,
        recipientPubKey,
      )
      await grantAccess({
        targetUserId,
        encryptedPrivateKey: encryptedWsPrivateKey,
      })
      toast.success('Access granted')
    } catch (err) {
      toast.error('Failed to grant access')
      console.error(err)
    } finally {
      setGranting(false)
    }
  }

  useEffect(() => {
    if (pendingGrant && workspacePrivateKeyJwk) {
      setPendingGrant(false)
      doGrantAccess(workspacePrivateKeyJwk)
    }
  })

  async function handleClick() {
    if (workspacePrivateKeyJwk) {
      await doGrantAccess(workspacePrivateKeyJwk)
    } else {
      setPassphraseOpen(true)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        loading={granting}
        onClick={handleClick}
      >
        Grant access
      </Button>
      <PassphraseDialog
        open={passphraseOpen}
        onOpenChange={setPassphraseOpen}
        unlock={unlock}
        onUnlocked={() => {
          setPassphraseOpen(false)
          setPendingGrant(true)
        }}
        description="Your passphrase is needed to decrypt the workspace key before granting access to this member."
        submitLabel="Unlock & grant access"
      />
    </>
  )
}

// --- Invite Dialog ---

function InviteDialog({
  existingEmails = [],
  atSeatLimit = false,
}: {
  existingEmails?: Array<string>
  atSeatLimit?: boolean
}) {
  const sendInvitation = useAction(api.members.sendInvitation)
  const [open, setOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<Array<string>>([])
  const [sending, setSending] = useState(false)

  function addEmail() {
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Invalid email address')
      return
    }
    if (emails.includes(trimmed)) {
      toast.error('Email already added')
      return
    }
    if (existingEmails.includes(trimmed)) {
      toast.error('This person is already a member or has a pending invitation')
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setEmailInput('')
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email))
  }

  async function handleSend() {
    if (emails.length === 0) return
    setSending(true)
    try {
      await sendInvitation({ emails })
      toast.success(
        emails.length === 1 ? 'Invitation sent' : 'Invitations sent',
      )
      setEmails([])
      setEmailInput('')
      setOpen(false)
    } catch (error) {
      Sentry.captureException(error)
      toast.error('Failed to send invitations')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={atSeatLimit}>
          {atSeatLimit ? 'Seat limit reached' : 'Invite'}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Invite members</DialogTitle>
          <DialogDescription>
            Send invitations to join your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="email@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEmail()
                }
              }}
            />
            <Button variant="outline" onClick={addEmail}>
              Add
            </Button>
          </div>
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="rounded-sm hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <InviteFooter
          onCancel={() => setOpen(false)}
          onConfirm={handleSend}
          disabled={emails.length === 0 || sending}
          sending={sending}
          count={emails.length}
        />
      </DialogContent>
    </Dialog>
  )
}

function InviteFooter({
  onCancel,
  onConfirm,
  disabled,
  sending,
  count,
}: {
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
  sending: boolean
  count: number
}) {
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
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Cancel <Kbd>Esc</Kbd>
      </Button>
      <Button onClick={handleConfirm} disabled={disabled} loading={sending}>
        Send {count > 0 && count} invitation{count !== 1 ? 's' : ''}{' '}
        <HotkeyDisplay hotkey={{ keys: 'mod+enter' }} />
      </Button>
    </DialogFooter>
  )
}
