// Frontend-only mock AI service. No network calls, no API keys.
// Swap this module for a real provider later without touching the UI —
// `useAIChat`/the AI store only depends on `streamMockAIResponse`'s shape.

const MOCK_RESPONSE = 'This capability will be available soon from Arvan.'

const MIN_TOKEN_DELAY_MS = 30
const MAX_TOKEN_DELAY_MS = 70

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getMockAIResponse(_message: string): string {
  return MOCK_RESPONSE
}

/** Yields the response progressively, one token at a time. */
export async function* streamMockAIResponse(message: string): AsyncGenerator<string> {
  const response = getMockAIResponse(message)
  const tokens = response.split(/(\s+)/).filter(Boolean)

  let streamed = ''
  for (const token of tokens) {
    await delay(MIN_TOKEN_DELAY_MS + Math.random() * (MAX_TOKEN_DELAY_MS - MIN_TOKEN_DELAY_MS))
    streamed += token
    yield streamed
  }
}
