'use node'

import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import {
  decryptAgentPrivateKey,
  decryptKeySlot,
  jwkToPrivateKeyBytes,
} from './serverCrypto'

/**
 * Resolve the workspace private key bytes for the agent.
 * Uses the 3-step agent key chain:
 * 1. Get agent encryption key → decrypt with AGENT_KEY_SECRET
 * 2. Get agent key slot → decrypt workspace private key
 * 3. Return workspace private key bytes
 *
 * Returns null if any step fails (missing key, missing env var, etc.)
 */
export async function getWorkspaceDecryptionKey(
  ctx: ActionCtx,
  workspaceId: Id<'workspaces'>,
): Promise<Uint8Array | null> {
  const agentId = `bunkr-agent:${workspaceId}`
  const secret = process.env.AGENT_KEY_SECRET
  if (!secret) return null

  const agentKey = await ctx.runQuery(internal.agent.getAgentEncryptionKey, {
    agentUserId: agentId,
  })
  if (!agentKey) return null

  const agentPrivateKeyBytes = decryptAgentPrivateKey(
    agentKey.encryptedPrivateKey,
    secret,
    agentKey.publicKey,
  )

  const keySlot = await ctx.runQuery(internal.agent.getAgentKeySlot, {
    workspaceId,
    agentUserId: agentId,
  })
  if (!keySlot) return null

  const wsPrivateKeyJwk = await decryptKeySlot(
    keySlot.encryptedPrivateKey,
    agentPrivateKeyBytes,
  )

  return jwkToPrivateKeyBytes(wsPrivateKeyJwk)
}
