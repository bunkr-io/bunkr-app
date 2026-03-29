import { createFileRoute } from '@tanstack/react-router'

const SENTRY_HOST = 'o4511128509349888.ingest.de.sentry.io'
const SENTRY_PROJECT_ID = '4511128517607504'

export const Route = createFileRoute('/api/tunnel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const envelope = await request.text()
        const piece = envelope.split('\n')[0]
        const header = JSON.parse(piece) as { dsn?: string }
        const dsn = header.dsn ? new URL(header.dsn) : null

        if (!dsn || dsn.hostname !== SENTRY_HOST) {
          return new Response('Invalid DSN', { status: 400 })
        }

        const projectId = dsn.pathname.replace('/', '')
        if (projectId !== SENTRY_PROJECT_ID) {
          return new Response('Invalid project', { status: 400 })
        }

        const upstream = `https://${SENTRY_HOST}/api/${projectId}/envelope/`
        const response = await fetch(upstream, {
          method: 'POST',
          body: envelope,
          headers: {
            'Content-Type': 'application/x-sentry-envelope',
          },
        })

        return new Response(response.body, {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
