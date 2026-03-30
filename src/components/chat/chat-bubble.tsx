import { Message, MessageContent } from '~/components/ui/message'

interface ChatBubbleProps {
  variant: 'user' | 'assistant'
  children: string
}

export function ChatBubble({ variant, children }: ChatBubbleProps) {
  if (variant === 'user') {
    return (
      <Message className="flex-row-reverse">
        <MessageContent className="max-w-[80%] bg-primary text-primary-foreground">
          {children}
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message>
      <MessageContent
        markdown
        className="bg-background text-foreground prose dark:prose-invert max-w-full overflow-x-auto"
      >
        {children}
      </MessageContent>
    </Message>
  )
}
