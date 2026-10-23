import { describe, expect, it, vi } from 'vitest'
import {
  faviconUrl,
  fetchImageFromUrl,
  fileToBlob,
  IMAGE_SOURCE_TYPES,
} from '../src/lib/image/source'

describe('source: faviconUrl', () => {
  it('builds cardyb favicon URL with encoded canonical https url', () => {
    const url = faviconUrl('example.com')
    expect(url).toBe('https://cardyb.bsky.app/v1/favicon?url=https%3A%2F%2Fexample.com%2F')

    const urlWithPath = faviconUrl('https://myblog.org/about')
    expect(urlWithPath).toBe('https://cardyb.bsky.app/v1/favicon?url=https%3A%2F%2Fmyblog.org%2Fabout')
  })

  it('throws on invalid site URL', () => {
    expect(() => faviconUrl('')).toThrow('Invalid site URL')
    expect(() => faviconUrl('localhost')).toThrow('Invalid site URL')
    expect(() => faviconUrl('not a url')).toThrow('Invalid site URL')
  })
})

describe('source: fileToBlob', () => {
  it('accepts valid image blobs under 10 MB', () => {
    const blob = new Blob([new Uint8Array(100)], { type: 'image/png' })
    expect(fileToBlob(blob)).toBe(blob)

    const maxBlob = new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'image/jpeg' })
    expect(fileToBlob(maxBlob)).toBe(maxBlob)
  })

  it('rejects non-image blobs', () => {
    const textBlob = new Blob(['hello'], { type: 'text/plain' })
    expect(() => fileToBlob(textBlob)).toThrow('File is not an image')

    const pdfBlob = new Blob([new Uint8Array(50)], { type: 'application/pdf' })
    expect(() => fileToBlob(pdfBlob)).toThrow('File is not an image')

    const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' })
    expect(() => fileToBlob(svgBlob)).toThrow('File is not an image of an allowed type')
  })

  it('rejects image blobs exceeding 10 MB', () => {
    const oversized = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' })
    expect(() => fileToBlob(oversized)).toThrow('Image exceeds 10 MB')
  })
})

describe('source: fetchImageFromUrl', () => {
  it('requires https url', async () => {
    await expect(fetchImageFromUrl('http://example.com/pic.png')).rejects.toThrow(
      'Image URL must use HTTPS',
    )
    await expect(fetchImageFromUrl('ftp://example.com/pic.png')).rejects.toThrow(
      'Image URL must use HTTPS',
    )
    await expect(fetchImageFromUrl('invalid-url')).rejects.toThrow()
  })

  it('succeeds via direct CORS fetch when allowed', async () => {
    const expectedBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(expectedBlob, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    )

    const blob = await fetchImageFromUrl('https://example.com/pic.png', fakeFetch as typeof fetch)
    expect(blob.type).toBe('image/png')
    expect(fakeFetch).toHaveBeenCalledTimes(1)
    expect(fakeFetch).toHaveBeenCalledWith('https://example.com/pic.png', { mode: 'cors' })
  })

  it('retries via /api/image-proxy on TypeError (CORS failure)', async () => {
    const expectedBlob = new Blob([new Uint8Array([4, 5, 6])], { type: 'image/webp' })
    let callCount = 0
    const fakeFetch = vi.fn().mockImplementation((input: string) => {
      callCount++
      if (callCount === 1) {
        // Direct request fails due to CORS (TypeError in fetch standard)
        return Promise.reject(new TypeError('Failed to fetch (CORS block)'))
      }
      expect(input).toBe('/api/image-proxy?url=https%3A%2F%2Fother.com%2Favatar.webp')
      return Promise.resolve(
        new Response(expectedBlob, {
          status: 200,
          headers: { 'Content-Type': 'image/webp' },
        }),
      )
    })

    const blob = await fetchImageFromUrl('https://other.com/avatar.webp', fakeFetch as typeof fetch)
    expect(blob.type).toBe('image/webp')
    expect(callCount).toBe(2)
  })

  it('does not retry proxy on non-TypeError exceptions', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('AbortError or custom error'))

    await expect(
      fetchImageFromUrl('https://example.com/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('AbortError or custom error')
    expect(fakeFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on non-ok HTTP responses', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    )

    await expect(
      fetchImageFromUrl('https://example.com/missing.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Image request failed (404)')
  })

  it('throws when response Content-Type is not an image', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response('<html><body>Not an image</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    await expect(
      fetchImageFromUrl('https://example.com/page.html', fakeFetch as typeof fetch),
    ).rejects.toThrow('Response is not an image')
  })

  it('rejects non-default ports and IP literals/private hosts client-side before fetching', async () => {
    const fakeFetch = vi.fn()

    // Port rejected
    await expect(
      fetchImageFromUrl('https://example.com:8080/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: port-not-allowed')

    // IPv4 literals rejected
    await expect(
      fetchImageFromUrl('https://127.0.0.1/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: ip-not-allowed')
    await expect(
      fetchImageFromUrl('https://192.168.1.1/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: ip-not-allowed')

    // IPv6 literal rejected
    await expect(
      fetchImageFromUrl('https://[::1]/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: ip-not-allowed')

    // Private / local domains rejected
    await expect(
      fetchImageFromUrl('https://localhost/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: private-host')
    await expect(
      fetchImageFromUrl('https://server.local/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: private-host')
    await expect(
      fetchImageFromUrl('https://box.lan/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: private-host')

    // Single-label host rejected
    await expect(
      fetchImageFromUrl('https://intranet/pic.png', fakeFetch as typeof fetch),
    ).rejects.toThrow('Invalid image URL: single-label-host')

    expect(fakeFetch).not.toHaveBeenCalled()
  })

  it('retries via /api/image-proxy when direct response is not ok or not an allowed image type', async () => {
    const expectedBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    let callCount = 0

    // Direct fetch returns 200 text/html -> proxy retry returns 200 image/png
    const fakeFetchHtml = vi.fn().mockImplementation((input: string) => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve(
          new Response('<html>login page</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }),
        )
      }
      expect(input).toBe('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fpic.png')
      return Promise.resolve(
        new Response(expectedBlob, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
      )
    })

    const blob = await fetchImageFromUrl('https://example.com/pic.png', fakeFetchHtml as typeof fetch)
    expect(blob.type).toBe('image/png')
    expect(callCount).toBe(2)

    // Direct fetch returns 500 server error -> proxy retry returns 200 image/jpeg
    let callCount500 = 0
    const fakeFetch500 = vi.fn().mockImplementation((input: string) => {
      callCount500++
      if (callCount500 === 1) {
        return Promise.resolve(new Response('Server Error', { status: 500 }))
      }
      return Promise.resolve(
        new Response(new Blob([new Uint8Array([4, 5])], { type: 'image/jpeg' }), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      )
    })

    const blob2 = await fetchImageFromUrl('https://example.com/pic.jpg', fakeFetch500 as typeof fetch)
    expect(blob2.type).toBe('image/jpeg')
    expect(callCount500).toBe(2)
  })

  it('exports IMAGE_SOURCE_TYPES and rejects SVG in fetchImageFromUrl', async () => {
    expect(IMAGE_SOURCE_TYPES).toEqual([
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ])
    expect((IMAGE_SOURCE_TYPES as readonly string[]).includes('image/svg+xml')).toBe(false)

    // Direct fetch returns SVG, proxy retry also returns SVG -> rejected
    const fakeFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response('<svg></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
      ),
    )

    await expect(
      fetchImageFromUrl('https://example.com/vector.svg', fakeFetch as typeof fetch),
    ).rejects.toThrow('Response is not an image of an allowed type')
  })

  it('enforces 10 MB streaming cap via Content-Length and chunk counter', async () => {
    const TEN_MB = 10 * 1024 * 1024

    // 1. Content-Length > 10 MB
    const fakeFetchHeader = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(10), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': String(TEN_MB + 1),
        },
      }),
    )
    await expect(
      fetchImageFromUrl('https://example.com/huge.png', fakeFetchHeader as typeof fetch),
    ).rejects.toThrow('Image exceeds 10 MB')

    // 2. Streamed chunks exceed 10 MB without Content-Length
    const chunk1 = new Uint8Array(6 * 1024 * 1024)
    const chunk2 = new Uint8Array(5 * 1024 * 1024) // 6 + 5 = 11 MB > 10 MB
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1)
        controller.enqueue(chunk2)
        controller.close()
      },
    })
    const fakeFetchStream = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    )
    await expect(
      fetchImageFromUrl('https://example.com/stream-huge.png', fakeFetchStream as typeof fetch),
    ).rejects.toThrow('Image exceeds 10 MB')
  })
})
