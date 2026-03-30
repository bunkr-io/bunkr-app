import { google } from '@ai-sdk/google'
import type { ProviderOptions } from '@ai-sdk/provider-utils'

// Centralized model configuration — change here to swap models for all agents.

export const chatModel = () => google('gemini-2.5-flash-lite')

export const titleModel = () => google('gemini-2.5-flash-lite')

/** Provider options to disable thinking for the title model. Update when swapping titleModel provider. */
export const titleModelProviderOptions: ProviderOptions = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
}
