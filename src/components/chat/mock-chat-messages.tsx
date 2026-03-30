import { ShieldAlert } from 'lucide-react'
import { ChatBubble } from '~/components/chat/chat-bubble'
import { ChatEmptyState } from '~/components/chat/chat-empty-state'
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '~/components/ui/chat-container'
import { Loader } from '~/components/ui/loader'
import { ScrollButton } from '~/components/ui/scroll-button'
import { SystemMessage } from '~/components/ui/system-message'
import type { MockChatMessage } from '~/contexts/chat-context'

interface MockChatMessagesProps {
  messages: MockChatMessage[]
  isThinking: boolean
  onSuggestionClick: (suggestion: string) => void
}

export function MockChatMessages({
  messages,
  isThinking,
  onSuggestionClick,
}: MockChatMessagesProps) {
  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <ChatEmptyState onSuggestionClick={onSuggestionClick} />
      </div>
    )
  }

  return (
    <ChatContainerRoot className="relative flex-1">
      <ChatContainerContent className="gap-4 p-4">
        <SystemMessage
          variant="warning"
          icon={<ShieldAlert className="size-4" />}
        >
          Conversations are stored unencrypted on our servers.
        </SystemMessage>
        {messages.map((message) => (
          <ChatBubble key={message.id} variant={message.role}>
            {message.content}
          </ChatBubble>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 px-1">
            <Loader variant="text-shimmer" text="Thinking" />
          </div>
        )}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <ScrollButton />
      </div>
    </ChatContainerRoot>
  )
}
