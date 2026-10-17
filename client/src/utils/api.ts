export const SUMMARY_MIN = 10;
export const SUMMARY_MAX = 1000;

/** Asks OUR backend (never Gemini directly) for a summary. Throws Error with a friendly message. */
export async function requestSummary(description: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('The request timed out. Please try again.');
    throw new Error('Could not reach the backend server. Is it running? (See the README, step "Start the backend".)');
  } finally {
    clearTimeout(timer);
  }

  let data: { summary?: unknown; error?: { message?: string } } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error(data?.error?.message ?? `The server returned an error (${res.status}).`);
  if (!data || typeof data.summary !== 'string' || !data.summary.trim()) {
    throw new Error('The server sent an unexpected response. Please try again.');
  }
  return data.summary;
}
