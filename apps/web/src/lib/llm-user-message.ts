/** Turn raw LiteLLM / provider errors into short UI copy. */
export function formatLlmUserMessage(error: string | null | undefined): string {
  const raw = (error ?? '').trim();
  if (!raw) return 'AI rewrite is temporarily unavailable.';

  if (/exceeded your current quota|insufficient_quota|billing details/i.test(raw)) {
    return 'OpenAI quota exceeded — check plan and billing on platform.openai.com.';
  }
  if (/RateLimitError|rate[_ ]?limit/i.test(raw)) {
    return 'OpenAI rate limit hit — wait a moment and try again.';
  }
  if (/litellm is not installed/i.test(raw)) {
    return 'AI extras are not installed on the AI service.';
  }
  if (/OPENAI_API_KEY|AuthenticationError|invalid_api_key/i.test(raw)) {
    return 'OpenAI API key is missing or invalid on the AI service.';
  }

  // Keep provider messages readable but avoid dumping huge stack traces.
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}
