import { ShieldAlert } from 'lucide-react'
import { SystemMessage } from '~/components/ui/system-message'

export function ChatDisclaimer() {
  return (
    <SystemMessage variant="warning" icon={<ShieldAlert className="size-4" />}>
      Conversations are stored unencrypted on our servers. Responses may contain
      mistakes and are for informational purposes only — not financial advice.
    </SystemMessage>
  )
}
