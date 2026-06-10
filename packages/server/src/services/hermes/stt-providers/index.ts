import { transcribeLocal } from './local'
import { transcribeOpenAiCompatible } from './openai'
import type { SttTranscribeInput, SttTranscribeResult } from './types'

export * from './openai'
export * from './types'
export * from './local'

export async function transcribeWithProvider(input: SttTranscribeInput): Promise<SttTranscribeResult> {
  switch (input.provider) {
    case 'openai':
    case 'custom':
      return transcribeOpenAiCompatible(input)
    case 'local':
      return transcribeLocal(input)
    default:
      throw new Error(`Unsupported STT provider: ${String(input.provider)}`)
  }
}
