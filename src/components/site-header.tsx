import * as React from 'react'
import { Eye, EyeOff, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemUI,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { usePrivacy } from '~/contexts/privacy-context'
import { useEncryption } from '~/contexts/encryption-context'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function SiteHeader({
  title = 'Dashboard',
  breadcrumbs,
}: {
  title?: string
  breadcrumbs?: Array<BreadcrumbItem>
}) {
  const { isPrivate, togglePrivacy } = usePrivacy()
  const { isEncryptionEnabled, isUnlocked, lock } = useEncryption()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1
                return (
                  <React.Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItemUI>
                      {isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.href}>{item.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItemUI>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <h1 className="text-base font-medium">{title}</h1>
        )}
        <div className="ml-auto flex items-center gap-1">
          {isEncryptionEnabled && isUnlocked ? (
            <EncryptionStatusButton onLock={lock} />
          ) : !isEncryptionEnabled ? (
            <EnableEncryptionButton />
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={togglePrivacy}
                aria-label={isPrivate ? 'Show balances' : 'Hide balances'}
              >
                {isPrivate ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPrivate ? 'Show balances' : 'Hide balances'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}

function EnableEncryptionButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/settings/encryption"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ShieldAlert className="size-3.5" />
          <span className="hidden sm:inline">Enable encryption</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        Your data is stored without encryption — enable it to protect your
        financial information
      </TooltipContent>
    </Tooltip>
  )
}

function EncryptionStatusButton({ onLock }: { onLock: () => void }) {
  return (
    <div className="flex items-center">
      <div className="flex h-8 items-center divide-x divide-border rounded-md border">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1.5 rounded-l-md px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span className="hidden sm:inline">End-to-end encrypted</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>All your data is end-to-end encrypted</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onLock}
              className="inline-flex items-center rounded-r-md px-2 py-1.5 text-foreground transition-colors hover:bg-accent"
              aria-label="Lock vault"
            >
              <Lock className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Lock vault</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
