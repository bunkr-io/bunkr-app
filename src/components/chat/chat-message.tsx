import { ChatBubble } from '~/components/chat/chat-bubble'
import type { MockChatMessage } from '~/contexts/chat-context'

interface ChatMessageProps {
  message: MockChatMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  return <ChatBubble variant={message.role}>{message.content}</ChatBubble>
}
