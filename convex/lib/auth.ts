import type { UserIdentity } from 'convex/server'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }
  return identity.subject
}

export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error('Unauthenticated')
  }
  return userId
}

/** Extract actor display info from a Convex UserIdentity (Clerk OIDC token). */
export function getActorInfo(identity: UserIdentity | null): {
  actorId: string | undefined
  actorName: string | undefined
  actorAvatarUrl: string | undefined
} {
  if (!identity) {
    return {
      actorId: undefined,
      actorName: undefined,
      actorAvatarUrl: undefined,
    }
  }

  // Clerk may populate `name`, or `givenName`+`familyName`, or `nickname`
  const name =
    identity.name ??
    ([identity.givenName, identity.familyName].filter(Boolean).join(' ') ||
      undefined) ??
    identity.nickname ??
    undefined

  // Convex maps OIDC `picture` claim to `pictureUrl`
  const avatarUrl =
    typeof identity.pictureUrl === 'string'
      ? identity.pictureUrl
      : typeof identity.picture === 'string'
        ? identity.picture
        : undefined

  return {
    actorId: identity.subject,
    actorName: name,
    actorAvatarUrl: avatarUrl,
  }
}
