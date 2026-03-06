import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { encryptForProfile } from './lib/serverCrypto'

const http = httpRouter()

interface WebhookPayload {
  type?: string
  id_user?: number
  id?: number
  accounts?: Array<WebhookAccount>
  connector?: { name?: string }
  state?: string
  last_update?: string
}

interface WebhookAccount {
  id: number
  number?: string
  iban?: string
  balance?: number
  original_name?: string
  name?: string
  type?: string
  currency?: { id?: string }
  disabled?: boolean
  deleted?: unknown
  last_update?: string
}

http.route({
  path: '/powens/callback',
  method: 'GET',
  // eslint-disable-next-line @typescript-eslint/require-await
  handler: httpAction(async (_, request) => {
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connection_id')
    const state = url.searchParams.get('state')

    const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'

    const params = new URLSearchParams()
    if (connectionId) params.set('connection_id', connectionId)
    if (state) params.set('state', state)

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${siteUrl}/powens/callback?${params.toString()}`,
      },
    })
  }),
})

http.route({
  path: '/powens/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const payload = (await request.json()) as WebhookPayload

    const type = payload.type

    if (type === 'CONNECTION_SYNCED') {
      const powensUserId = payload.id_user
      const powensConnectionId = payload.id
      const accounts = payload.accounts

      if (!powensUserId || !powensConnectionId) {
        return new Response('Missing id_user or id', { status: 400 })
      }

      // Find the profile linked to this Powens user
      const profile = await ctx.runQuery(
        internal.powens.findProfileByPowensUserId,
        { powensUserId },
      )

      if (!profile) {
        console.warn(`No profile found for Powens user ${powensUserId}`)
        return new Response('OK', { status: 200 })
      }

      // Check if encryption is enabled for this profile
      const publicKey: string | null = await ctx.runQuery(
        internal.encryptionKeys.getPublicKeyForProfile,
        { profileId: profile._id },
      )

      const realConnectorName = payload.connector?.name ?? 'Unknown'

      let connectionEncryptedData: string | undefined
      if (publicKey) {
        connectionEncryptedData = await encryptForProfile(
          { connectorName: realConnectorName },
          publicKey,
        )
      }

      const bankAccounts = await Promise.all(
        (accounts ?? []).map(async (acct) => {
          const number = acct.number
          const iban = acct.iban
          const balance = acct.balance ?? 0
          const name = acct.original_name ?? acct.name ?? 'Unnamed Account'

          let encryptedData: string | undefined
          if (publicKey) {
            encryptedData = await encryptForProfile(
              { name, number, iban, balance },
              publicKey,
            )
          }

          return {
            powensBankAccountId: acct.id,
            name: publicKey ? 'Encrypted' : name,
            number: publicKey ? undefined : number,
            iban: publicKey ? undefined : iban,
            type: acct.type,
            balance: publicKey ? 0 : balance,
            currency: acct.currency?.id ?? 'EUR',
            disabled: acct.disabled ?? false,
            deleted: acct.deleted != null,
            lastSync: acct.last_update,
            encryptedData,
          }
        }),
      )

      await ctx.runMutation(internal.powens.syncConnectionFromWebhook, {
        profileId: profile._id,
        powensConnectionId,
        connectorName: publicKey ? 'Encrypted' : realConnectorName,
        state: payload.state,
        lastSync: payload.last_update,
        bankAccounts,
        encryptedData: connectionEncryptedData,
      })

      await ctx.runAction(internal.powens.syncInvestmentsFromWebhook, {
        profileId: profile._id,
        powensConnectionId,
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http
