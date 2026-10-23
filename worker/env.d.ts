// Minimal Workers runtime types. @cloudflare/workers-types is not loaded
// globally because its declarations clash with the DOM lib used by the app.
interface Fetcher {
  fetch(request: Request): Promise<Response>
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>
}
