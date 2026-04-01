import usePresence from '@convex-dev/presence/react'
import { api } from '../../convex/_generated/api'

export function usePresenceHeartbeat(roomId: string, userId: string) {
  usePresence(api.presence, roomId, userId)
}
