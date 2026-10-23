import { imageTargetError } from '../src/lib/image/target'
import { IMAGE_SOURCE_TYPES } from '../src/lib/image/source'
const MAX_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = new Set<string>(IMAGE_SOURCE_TYPES)

export function validateProxyTarget(input: string, selfHost: string): { ok: true; url: URL } | { ok: false; code: string } {
  let url: URL
  try { url = new URL(input) } catch { return { ok: false, code: 'invalid-url' } }
  if (url.protocol !== 'https:') return { ok: false, code: 'https-required' }
  const targetError = imageTargetError(url)
  if (targetError) return { ok: false, code: targetError }
  const host = url.hostname.toLowerCase().replace(/\.+$/, '')
  const ownHost = selfHost.toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '')
  if (host === ownHost) return { ok: false, code: 'self-host' }
  return { ok: true, url }
}
function errorResponse(status: number, code: string): Response {
  return Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
function isSameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true
  if (request.headers.has('sec-fetch-site') || request.headers.has('origin')) return false
  try {
    return new URL(request.headers.get('referer') ?? '').origin === new URL(request.url).origin
  } catch { return false }
}
function matchesImageType(body: Uint8Array, mime: string): boolean {
  const matches = (offset: number, bytes: number[]) => bytes.every((byte, index) => body[offset + index] === byte)
  const text = (offset: number, value: string) => matches(offset, Array.from(value, character => character.charCodeAt(0)))
  switch (mime) {
    case 'image/png': return matches(0, [137, 80, 78, 71, 13, 10, 26, 10])
    case 'image/jpeg': return matches(0, [255, 216, 255])
    case 'image/gif': return text(0, 'GIF87a') || text(0, 'GIF89a')
    case 'image/webp': return text(0, 'RIFF') && text(8, 'WEBP')
    case 'image/avif': return text(4, 'ftyp') && (text(8, 'avif') || text(8, 'avis'))
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon': return matches(0, [0, 0, 1, 0])
    default: return false
  }
}
export async function proxyImage(request: Request, fetchImpl: typeof fetch = fetch,
  limiter?: { limit(options: { key: string }): Promise<{ success: boolean }> },
): Promise<Response> {
  if (request.method !== 'GET') {
    const response = errorResponse(405, 'method-not-allowed')
    response.headers.set('Allow', 'GET')
    return response
  }
  const destination = request.headers.get('sec-fetch-dest')
  if (destination !== null && destination !== 'empty' && destination !== 'image') return errorResponse(403, 'fetch-destination-not-allowed')
  if (!isSameOrigin(request)) return errorResponse(403, 'same-origin-required')
  if (limiter && !(await limiter.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })).success) return errorResponse(429, 'rate-limit-exceeded')
  const requestUrl = new URL(request.url)
  const input = requestUrl.searchParams.get('url')
  if (!input) return errorResponse(400, 'missing-url')
  let target = validateProxyTarget(input, requestUrl.hostname)
  if (!target.ok) return errorResponse(400, target.code)
  const controller = new AbortController()
  const abort = () => controller.abort(request.signal.reason)
  request.signal.addEventListener('abort', abort, { once: true })
  if (request.signal.aborted) abort()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    let response: Response
    let redirects = 0
    while (true) {
      response = await fetchImpl(target.url.href, {
        redirect: 'manual', signal: controller.signal, credentials: 'omit', headers: { Accept: 'image/*' },
      })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      await response.body?.cancel()
      if (redirects++ >= 3) return errorResponse(400, 'too-many-redirects')
      const location = response.headers.get('location')
      if (!location) return errorResponse(400, 'missing-redirect-location')
      let next: string
      try { next = new URL(location, target.url).href } catch { return errorResponse(400, 'invalid-redirect-location') }
      target = validateProxyTarget(next, requestUrl.hostname)
      if (!target.ok) return errorResponse(400, target.code)
    }
    if (!response.ok) {
      await response.body?.cancel()
      return errorResponse(502, 'upstream-error')
    }
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
    if (!IMAGE_TYPES.has(mime)) {
      await response.body?.cancel()
      return errorResponse(415, 'unsupported-image-type')
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      controller.abort()
      await response.body?.cancel().catch(() => undefined)
      return errorResponse(413, 'image-too-large')
    }
    // Buffer only up to the cap so an oversized stream can still return HTTP 413.
    const chunks: Uint8Array[] = []
    let bytes = 0
    const reader = response.body?.getReader()
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value.byteLength
          if (bytes > MAX_BYTES) {
            controller.abort()
            await reader.cancel().catch(() => undefined)
            return errorResponse(413, 'image-too-large')
          }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
    }
    const body = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
    if (!matchesImageType(body, mime)) return errorResponse(415, 'image-type-mismatch')
    return new Response(body, { headers: {
      'Content-Type': mime,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Content-Disposition': 'attachment',
      'Cross-Origin-Resource-Policy': 'same-origin',
    } })
  } catch {
    return errorResponse(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? 'upstream-timeout' : 'upstream-fetch-failed')
  } finally {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', abort)
  }
}
export default proxyImage
