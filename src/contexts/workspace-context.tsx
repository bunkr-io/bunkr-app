import { useConvexAuth, useQuery } from 'convex/react'
import * as React from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

interface WorkspaceContextValue {
  workspace: Doc<'workspaces'> | null | undefined
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const workspace = useQuery(
    api.workspaces.getMyWorkspace,
    isAuthenticated ? {} : 'skip',
  )

  return (
    <WorkspaceContext.Provider value={{ workspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return ctx
}
