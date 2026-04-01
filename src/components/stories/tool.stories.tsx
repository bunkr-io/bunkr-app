import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tool } from '../ui/tool'

const meta = {
  title: 'Data Display/Tool',
  component: Tool,
  decorators: [
    (Story) => (
      <div className="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tool>

export default meta
type Story = StoryObj<typeof meta>

export const Processing: Story = {
  args: {
    toolPart: {
      type: 'Searching categories',
      state: 'input-streaming',
      input: { query: 'restaurants' },
      toolCallId: 'call_1',
    },
  },
}

export const InputAvailable: Story = {
  args: {
    toolPart: {
      type: 'Analyzing spending',
      state: 'input-available',
      input: {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        categoryFilter: 'food_and_restaurants',
      },
      toolCallId: 'call_2',
    },
  },
}

export const Completed: Story = {
  args: {
    toolPart: {
      type: 'Analyzing spending',
      state: 'output-available',
      input: {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        categoryFilter: 'food_and_restaurants',
      },
      output: {
        totalSpending: -482.5,
        totalIncome: 0,
        transactionCount: 12,
        byCategory: [
          { name: 'food_and_restaurants', amount: -482.5, count: 12 },
        ],
      },
      toolCallId: 'call_2',
    },
  },
}

export const CompletedExpanded: Story = {
  args: {
    toolPart: {
      type: 'Searching transactions',
      state: 'output-available',
      input: {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        query: 'Netflix',
      },
      output: {
        transactions: [
          {
            date: '2026-03-15',
            description: 'Netflix Monthly',
            amount: -13.49,
            category: 'entertainment',
            currency: 'EUR',
          },
        ],
        totalMatched: 1,
        query: 'Netflix',
      },
      toolCallId: 'call_3',
    },
    defaultOpen: true,
  },
}

export const ErrorState: Story = {
  args: {
    toolPart: {
      type: 'Loading accounts',
      state: 'output-error',
      input: {},
      errorText: 'Unable to access encrypted data',
      toolCallId: 'call_4',
    },
  },
}

export const SearchCategories: Story = {
  args: {
    toolPart: {
      type: 'Searching categories',
      state: 'output-available',
      input: { query: 'restaurant' },
      output: {
        categories: [
          {
            key: 'food_and_restaurants',
            label: 'Food & Restaurants',
            parentKey: null,
          },
        ],
      },
      toolCallId: 'call_5',
    },
    defaultOpen: true,
  },
}

export const ListAccounts: Story = {
  args: {
    toolPart: {
      type: 'Loading accounts',
      state: 'output-available',
      input: {},
      output: {
        accounts: [
          {
            id: 'acc_1',
            name: 'Checking Account',
            balance: 3240.5,
            currency: 'EUR',
            type: 'checking',
          },
          {
            id: 'acc_2',
            name: 'Savings Account',
            balance: 15800.0,
            currency: 'EUR',
            type: 'savings',
          },
        ],
      },
      toolCallId: 'call_6',
    },
    defaultOpen: true,
  },
}

export const MultipleToolCalls: Story = {
  args: {
    toolPart: {
      type: 'Searching categories',
      state: 'output-available',
      toolCallId: 'call_a',
    },
  },
  render: () => (
    <div className="flex flex-col gap-1">
      <Tool
        toolPart={{
          type: 'Searching categories',
          state: 'output-available',
          input: { query: 'restaurants' },
          output: {
            categories: [
              {
                key: 'food_and_restaurants',
                label: 'Food & Restaurants',
                parentKey: null,
              },
            ],
          },
          toolCallId: 'call_a',
        }}
      />
      <Tool
        toolPart={{
          type: 'Analyzing spending',
          state: 'input-streaming',
          input: {
            startDate: '2026-03-01',
            endDate: '2026-03-31',
            categoryFilter: 'food_and_restaurants',
          },
          toolCallId: 'call_b',
        }}
      />
    </div>
  ),
}
