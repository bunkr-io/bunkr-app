import { BotMessageSquare } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'

const SUGGESTIONS = [
  'Any unusual spending this month?',
  'What are my recurring expenses?',
  "What's my savings rate?",
  'Where do I spend the most?',
]

interface ChatEmptyStateProps {
  onSuggestionClick: (suggestion: string) => void
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <Empty className="border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BotMessageSquare />
        </EmptyMedia>
        <EmptyTitle>Welcome to Bunkr Agent</EmptyTitle>
        <EmptyDescription>Ask anything about your finances</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  )
}
