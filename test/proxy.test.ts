import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import workerApp from '../worker/index'
import proxyDefault, { proxyImage, validateProxyTarget } from '../worker/proxy'

describe('proxy: validateProxyTarget guards', () => {
  const selfHost = 'links.notx.blue'

  it('rejects invalid or unparseable URLs (invalid-url)', () => {
    expect(validateProxyTarget('not a url', selfHost)).toEqual({
      ok: false,
      code: 'invalid-url',
    })
    expect(validateProxyTarget('://broken', selfHost)).toEqual({
      ok: false,
      code: 'invalid-url',
    })
  })

  it('requires HTTPS protocol (https-required)', () => {
    expect(validateProxyTarget('http://example.com/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'https-required',
    })
    expect(validateProxyTarget('ftp://example.com/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'https-required',
    })
  })

  it('rejects non-default ports (port-not-allowed)', () => {
    expect(validateProxyTarget('https://example.com:8080/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'port-not-allowed',
    })
    expect(validateProxyTarget('https://example.com:8443/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'port-not-allowed',
    })
    // Port 443 is default for HTTPS and allowed
    const valid443 = validateProxyTarget('https://example.com:443/pic.png', selfHost)
    expect(valid443.ok).toBe(true)
  })

  it('rejects credentials in URL (credentials-not-allowed)', () => {
    expect(validateProxyTarget('https://user:pass@example.com/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'credentials-not-allowed',
    })
    expect(validateProxyTarget('https://user@example.com/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'credentials-not-allowed',
    })
  })

  it('rejects IP literals (ip-not-allowed)', () => {
    // IPv4
    expect(validateProxyTarget('https://127.0.0.1/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'ip-not-allowed',
    })
    expect(validateProxyTarget('https://192.168.1.1/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'ip-not-allowed',
    })
    expect(validateProxyTarget('https://10.0.0.1/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'ip-not-allowed',
    })
    // IPv6
    expect(validateProxyTarget('https://[::1]/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'ip-not-allowed',
    })
    expect(validateProxyTarget('https://[2001:db8::1]/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'ip-not-allowed',
    })
  })

  it('rejects private, internal, or special domains (private-host)', () => {
    expect(validateProxyTarget('https://localhost/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://api.localhost/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://router.local/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://service.internal/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://nas.lan/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://box.home.arpa/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
    expect(validateProxyTarget('https://hidden.onion/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'private-host',
    })
  })

  it('rejects single-label hostnames without a dot (single-label-host)', () => {
    expect(validateProxyTarget('https://intranet/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'single-label-host',
    })
    expect(validateProxyTarget('https://mydevbox/pic.png', selfHost)).toEqual({
      ok: false,
      code: 'single-label-host',
    })
  })

  it('rejects proxying to own host (self-host)', () => {
    expect(validateProxyTarget('https://links.notx.blue/api/image-proxy', selfHost)).toEqual({
      ok: false,
      code: 'self-host',
    })
    expect(validateProxyTarget('https://links.notx.blue:443/test.png', selfHost)).toEqual({
      ok: false,
      code: 'self-host',
    })
  })

  it('accepts valid public HTTPS target URLs', () => {
    const res = validateProxyTarget('https://example.com/images/cat.png', selfHost)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.url.href).toBe('https://example.com/images/cat.png')
    }
  })
})

describe('proxy: fetch handler with mocked global fetch', () => {
  const origin = 'https://links.notx.blue'

  const VALID_MAGIC_BODIES: Record<string, Uint8Array<ArrayBuffer>> = {
    'image/png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]),
    'image/jpeg': new Uint8Array([255, 216, 255, 0, 0]),
    'image/gif': new Uint8Array(new TextEncoder().encode('GIF89a\x00\x00')),
    'image/webp': new Uint8Array([...new TextEncoder().encode('RIFF1234WEBP'), 0, 0]),
    'image/avif': new Uint8Array([0, 0, 0, 0, ...new TextEncoder().encode('ftypavif'), 0, 0]),
    'image/x-icon': new Uint8Array([0, 0, 1, 0, 0, 0]),
    'image/vnd.microsoft.icon': new Uint8Array([0, 0, 1, 0, 0, 0]),
  }

  function magicBody(mime: string): Uint8Array<ArrayBuffer> {
    const bytes = VALID_MAGIC_BODIES[mime]
    if (!bytes) throw new Error(`Missing magic bytes for ${mime}`)
    return bytes
  }

  function makeProxyRequest(
    searchParams: Record<string, string> = { url: 'https://example.com/pic.png' },
    init: RequestInit = {},
  ): Request {
    const url = new URL('/api/image-proxy', origin)
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }
    const { headers, ...restInit } = init
    return new Request(url.href, {
      method: init.method ?? 'GET',
      ...restInit,
      headers: {
        'sec-fetch-site': 'same-origin',
        'sec-fetch-dest': 'image',
        ...headers,
      },
    })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects non-GET HTTP methods with 405 Method Not Allowed and Allow header', async () => {
    const req = makeProxyRequest(undefined, { method: 'POST' })
    const res = await proxyDefault(req)

    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET')
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('method-not-allowed')
  })

  describe('same-origin validation', () => {
    it('allows requests with sec-fetch-site: same-origin', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyDefault(req)
      expect(res.status).toBe(200)
    })

    it('rejects requests with sec-fetch-site: cross-site with 403', async () => {
      const req = new Request(`${origin}/api/image-proxy?url=https://example.com/pic.png`, {
        headers: { 'sec-fetch-site': 'cross-site' },
      })
      const res = await proxyDefault(req)
      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('same-origin-required')
    })

    it('rejects requests with foreign Origin header with 403', async () => {
      const req = new Request(`${origin}/api/image-proxy?url=https://example.com/pic.png`, {
        headers: { origin: 'https://evil.attacker.com' },
      })
      const res = await proxyDefault(req)
      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('same-origin-required')
    })

    it('allows requests without sec-fetch-site / origin when referer is same-origin', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = new Request(`${origin}/api/image-proxy?url=https://example.com/pic.png`, {
        headers: { referer: `${origin}/dashboard` },
      })
      const res = await proxyDefault(req)
      expect(res.status).toBe(200)
    })

    it('requires Sec-Fetch-Dest to be empty or image when present (navigation/iframe gets 403)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
          Promise.resolve(
            new Response(magicBody('image/png'), {
              status: 200,
              headers: { 'Content-Type': 'image/png' },
            }),
          ),
        ),
      )

      // document -> 403
      const reqDoc = makeProxyRequest(undefined, { headers: { 'sec-fetch-dest': 'document' } })
      const resDoc = await proxyDefault(reqDoc)
      expect(resDoc.status).toBe(403)
      expect(((await resDoc.json()) as { error: string }).error).toBe('fetch-destination-not-allowed')

      // iframe -> 403
      const reqIframe = makeProxyRequest(undefined, { headers: { 'sec-fetch-dest': 'iframe' } })
      const resIframe = await proxyDefault(reqIframe)
      expect(resIframe.status).toBe(403)
      expect(((await resIframe.json()) as { error: string }).error).toBe('fetch-destination-not-allowed')

      // empty -> 200
      const reqEmpty = makeProxyRequest(undefined, { headers: { 'sec-fetch-dest': 'empty' } })
      expect((await proxyDefault(reqEmpty)).status).toBe(200)

      // image -> 200
      const reqImage = makeProxyRequest(undefined, { headers: { 'sec-fetch-dest': 'image' } })
      expect((await proxyDefault(reqImage)).status).toBe(200)
    })

    it('rejects requests when referer is foreign or missing', async () => {
      const reqForeign = new Request(`${origin}/api/image-proxy?url=https://example.com/pic.png`, {
        headers: { referer: 'https://foreign.com/' },
      })
      expect((await proxyDefault(reqForeign)).status).toBe(403)

      const reqMissing = new Request(`${origin}/api/image-proxy?url=https://example.com/pic.png`)
      expect((await proxyDefault(reqMissing)).status).toBe(403)
    })
  })

  describe('query validation', () => {
    it('returns 400 missing-url when url parameter is absent', async () => {
      const req = new Request(`${origin}/api/image-proxy`, {
        headers: { 'sec-fetch-site': 'same-origin' },
      })
      const res = await proxyDefault(req)
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('missing-url')
    })

    it('returns 400 with guard error code when target is invalid', async () => {
      const req = makeProxyRequest({ url: 'http://insecure.com/pic.png' })
      const res = await proxyDefault(req)
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('https-required')
    })
  })

  describe('redirects handling', () => {
    it('follows up to 3 redirects and resolves target', async () => {
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(
            new Response(null, {
              status: 302,
              headers: { Location: 'https://example.com/step2' },
            }),
          )
        }
        if (callCount === 2) {
          return Promise.resolve(
            new Response(null, {
              status: 301,
              headers: { Location: 'https://example.com/step3' },
            }),
          )
        }
        if (callCount === 3) {
          return Promise.resolve(
            new Response(null, {
              status: 307,
              headers: { Location: 'https://example.com/final.png' },
            }),
          )
        }
        return Promise.resolve(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        )
      })

      vi.stubGlobal('fetch', mockFetch)
      const req = makeProxyRequest({ url: 'https://example.com/step1' })
      const res = await proxyDefault(req)

      expect(res.status).toBe(200)
      expect(callCount).toBe(4) // 3 redirects + 1 final request
    })

    it('rejects more than 3 redirects with 400 too-many-redirects', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: `${url}_next` },
          }),
        )
      })

      vi.stubGlobal('fetch', mockFetch)
      const req = makeProxyRequest({ url: 'https://example.com/redir0' })
      const res = await proxyDefault(req)

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('too-many-redirects')
    })

    it('rejects redirect missing Location header with 400', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 302 }))
      vi.stubGlobal('fetch', mockFetch)

      const req = makeProxyRequest({ url: 'https://example.com/nolocation' })
      const res = await proxyDefault(req)

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('missing-redirect-location')
    })

    it('re-validates target after redirect and rejects forbidden destinations', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { Location: 'https://localhost/secret.png' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const req = makeProxyRequest({ url: 'https://example.com/redir-to-local' })
      const res = await proxyDefault(req)

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('private-host')
    })
  })

  describe('content types verification', () => {
    it('accepts allowed image types (png, jpeg, webp, gif, avif, x-icon, vnd.microsoft.icon)', async () => {
      const allowed = [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/x-icon',
        'image/vnd.microsoft.icon',
      ]

      for (const mime of allowed) {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(
            new Response(magicBody(mime), {
              status: 200,
              headers: { 'Content-Type': mime },
            }),
          ),
        )

        const req = makeProxyRequest()
        const res = await proxyDefault(req)
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toBe(mime)
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox")
        expect(res.headers.get('Cache-Control')).toBe('no-store')
        expect(res.headers.get('CDN-Cache-Control')).toBe('no-store')
        expect(res.headers.get('Content-Disposition')).toBe('attachment')
        expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
      }
    })

    it('rejects SVG and non-image content types with 415 unsupported-image-type', async () => {
      const forbidden = ['image/svg+xml', 'text/html', 'application/json', 'application/octet-stream']

      for (const mime of forbidden) {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(
            new Response('sample data', {
              status: 200,
              headers: { 'Content-Type': mime },
            }),
          ),
        )

        const req = makeProxyRequest()
        const res = await proxyDefault(req)
        expect(res.status).toBe(415)
        const body = (await res.json()) as { error: string }
        expect(body.error).toBe('unsupported-image-type')
      }
    })

    it('returns 415 image-type-mismatch when magic bytes do not match declared content type', async () => {
      // PNG declared, but body contains JPEG bytes
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/jpeg'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )
      const res1 = await proxyDefault(makeProxyRequest())
      expect(res1.status).toBe(415)
      expect(((await res1.json()) as { error: string }).error).toBe('image-type-mismatch')

      // WebP declared, but body is missing RIFF...WEBP
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), {
            status: 200,
            headers: { 'Content-Type': 'image/webp' },
          }),
        ),
      )
      const res2 = await proxyDefault(makeProxyRequest())
      expect(res2.status).toBe(415)
      expect(((await res2.json()) as { error: string }).error).toBe('image-type-mismatch')

      // AVIF declared, but body missing ftyp avif/avis
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(new Uint8Array([0, 0, 0, 0, 102, 116, 121, 112, 120, 120, 120, 120]), {
            status: 200,
            headers: { 'Content-Type': 'image/avif' },
          }),
        ),
      )
      const res3 = await proxyDefault(makeProxyRequest())
      expect(res3.status).toBe(415)
      expect(((await res3.json()) as { error: string }).error).toBe('image-type-mismatch')
    })

    it('sets Cache-Control: no-store, CDN-Cache-Control: no-store, and Content-Disposition: attachment', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const res = await proxyDefault(makeProxyRequest())
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(res.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(res.headers.get('Content-Disposition')).toBe('attachment')

      // Error responses also set Cache-Control: no-store and CDN-Cache-Control: no-store
      const errRes400 = await proxyDefault(new Request(`${origin}/api/image-proxy`, {
        headers: { 'sec-fetch-site': 'same-origin' },
      }))
      expect(errRes400.status).toBe(400)
      expect(errRes400.headers.get('Cache-Control')).toBe('no-store')
      expect(errRes400.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(errRes400.headers.get('X-Content-Type-Options')).toBe('nosniff')

      const errRes403 = await proxyDefault(new Request(`${origin}/api/image-proxy`))
      expect(errRes403.status).toBe(403)
      expect(errRes403.headers.get('Cache-Control')).toBe('no-store')
      expect(errRes403.headers.get('CDN-Cache-Control')).toBe('no-store')
    })
  })

  describe('size limits and 2 MB streaming cap', () => {
    const TWO_MB = 2 * 1024 * 1024

    it('rejects responses with Content-Length > 2 MB with 413 image-too-large', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(new Uint8Array(10), {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Content-Length': String(TWO_MB + 1),
            },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyDefault(req)

      expect(res.status).toBe(413)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('image-too-large')
    })

    it('aborts and returns 413 when streamed chunks exceed 2 MB without Content-Length', async () => {
      const chunk1 = new Uint8Array(1.5 * 1024 * 1024) // 1.5 MB
      const chunk2 = new Uint8Array(1 * 1024 * 1024) // 1.0 MB (total 2.5 MB > 2 MB)

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(chunk1)
          controller.enqueue(chunk2)
          controller.close()
        },
      })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyDefault(req)

      expect(res.status).toBe(413)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('image-too-large')
    })

    it('buffers and serves images within the 2 MB limit successfully', async () => {
      const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 10, 20, 30, 40])
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(data, {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyDefault(req)

      expect(res.status).toBe(200)
      const returnedBuffer = new Uint8Array(await res.arrayBuffer())
      expect(returnedBuffer).toEqual(data)
    })
  })

  describe('upstream failures', () => {
    it('returns 502 upstream-error when upstream returns non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })))

      const req = makeProxyRequest()
      const res = await proxyDefault(req)

      expect(res.status).toBe(502)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('upstream-error')
    })

    it('returns 502 upstream-fetch-failed when upstream network call throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS resolution failed')))

      const req = makeProxyRequest()
      const res = await proxyDefault(req)

      expect(res.status).toBe(502)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('upstream-fetch-failed')
    })

    it('aborts upstream fetch when request.signal aborts and returns 504', async () => {
      const abortController = new AbortController()
      let upstreamSignal: AbortSignal | undefined

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url, init) => {
          upstreamSignal = init.signal
          return new Promise((_resolve, reject) => {
            upstreamSignal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          })
        }),
      )

      const req = makeProxyRequest(undefined, { signal: abortController.signal })
      const proxyPromise = proxyDefault(req)

      abortController.abort()

      const res = await proxyPromise
      expect(res.status).toBe(504)
      expect(((await res.json()) as { error: string }).error).toBe('upstream-timeout')
      expect(upstreamSignal?.aborted).toBe(true)
    })
  })

  describe('worker routing integration (worker/index.ts)', () => {
    it('routes /api/image-proxy to proxyImage and other paths to ASSETS', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const fakeAssets = {
        fetch: vi.fn().mockResolvedValue(new Response('Static asset', { status: 200 })),
      }

      // Proxy route
      const proxyReq = makeProxyRequest()
      const proxyRes = await workerApp.fetch(proxyReq, { ASSETS: fakeAssets as unknown as Fetcher })
      expect(proxyRes.status).toBe(200)

      // Static assets route
      const assetReq = new Request(`${origin}/index.html`)
      const assetRes = await workerApp.fetch(assetReq, { ASSETS: fakeAssets as unknown as Fetcher })
      expect(assetRes.status).toBe(200)
      expect(fakeAssets.fetch).toHaveBeenCalledWith(assetReq)
    })
  })

  describe('rate limiting (IMAGE_PROXY_LIMITER)', () => {
    it('skips rate limiting when limiter is undefined', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyImage(req, fetch, undefined)
      expect(res.status).toBe(200)
    })

    it('returns 429 rate-limit-exceeded when limiter limit check fails', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({ success: false }),
      }

      const req = makeProxyRequest(undefined, {
        headers: { 'cf-connecting-ip': '198.51.100.22' },
      })
      const res = await proxyImage(req, fetch, mockLimiter)

      expect(res.status).toBe(429)
      expect(((await res.json()) as { error: string }).error).toBe('rate-limit-exceeded')
      expect(mockLimiter.limit).toHaveBeenCalledWith({ key: '198.51.100.22' })
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    })

    it('falls back to "unknown" key when cf-connecting-ip is absent and allows request on success', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({ success: true }),
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(magicBody('image/png'), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          }),
        ),
      )

      const req = makeProxyRequest()
      const res = await proxyImage(req, fetch, mockLimiter)

      expect(res.status).toBe(200)
      expect(mockLimiter.limit).toHaveBeenCalledWith({ key: 'unknown' })
    })

    it('worker routing passes env.IMAGE_PROXY_LIMITER to proxyImage', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({ success: false }),
      }
      const fakeAssets = { fetch: vi.fn() }

      const req = makeProxyRequest()
      const res = await workerApp.fetch(req, {
        ASSETS: fakeAssets as unknown as Fetcher,
        IMAGE_PROXY_LIMITER: mockLimiter as unknown as RateLimit,
      })

      expect(res.status).toBe(429)
      expect(mockLimiter.limit).toHaveBeenCalled()
    })
  })
})
