import { describe, expect, it, vi } from 'vitest'
import { type BlobRef, type Did, XrpcError } from '../src/lib/types'
import { createXrpc } from '../src/lib/xrpc'

describe('xrpc: client wrapper', () => {
  const testDid: Did = 'did:plc:ragtjsm2j2vknwk2zOverflow'
  const pdsUrl = 'https://shroom.us-east.host.bsky.network'

  it('exposes did and generates blobUrl with PDS URL', () => {
    const fakeFetch = vi.fn()
    const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)

    expect(xrpc.did).toBe(testDid)
    const url = xrpc.blobUrl('bafkreiaaaaa')
    expect(url).toBe(
      'https://shroom.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aragtjsm2j2vknwk2zOverflow&cid=bafkreiaaaaa',
    )
  })

  describe('getRecord', () => {
    it('returns record envelope on successful fetch', async () => {
      const mockEnvelope = {
        uri: `at://${testDid}/app.bsky.actor.profile/self`,
        cid: 'bafyreiprofilecid',
        value: { $type: 'app.bsky.actor.profile', displayName: 'Alice' },
      }

      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockEnvelope), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const res = await xrpc.getRecord<typeof mockEnvelope.value>(
        'app.bsky.actor.profile',
        'self',
      )

      expect(res).toEqual(mockEnvelope)
      expect(fakeFetch).toHaveBeenCalledTimes(1)
      const [path, init] = fakeFetch.mock.calls[0]!
      expect(path).toContain('/xrpc/com.atproto.repo.getRecord?')
      expect(path).toContain(`repo=${encodeURIComponent(testDid)}`)
      expect(path).toContain('collection=app.bsky.actor.profile')
      expect(path).toContain('rkey=self')
      expect(init).toBeUndefined()
    })

    it('returns null when record is not found (status 400 + RecordNotFound)', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'RecordNotFound',
              message: 'Could not locate record: app.bsky.actor.profile/self',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const res = await xrpc.getRecord('app.bsky.actor.profile', 'self')
      expect(res).toBeNull()
    })

    it('returns null on RecordNotFound regardless of HTTP status (e.g. 404, 500)', async () => {
      for (const status of [404, 500, 410]) {
        const fakeFetch = vi.fn().mockImplementation(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                error: 'RecordNotFound',
                message: 'Record was not found',
              }),
              { status, headers: { 'Content-Type': 'application/json' } },
            ),
          ),
        )

        const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
        const res = await xrpc.getRecord('app.bsky.actor.profile', 'self')
        expect(res).toBeNull()
      }
    })

    it('throws XrpcError when 400 is returned with a different error', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'InvalidRequest',
              message: 'Repo is deactivated',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      await expect(xrpc.getRecord('app.bsky.actor.profile', 'self')).rejects.toMatchObject({
        name: 'XrpcError',
        status: 400,
        error: 'InvalidRequest',
        message: 'Repo is deactivated',
      })
    })

    it('throws XrpcError on server failure (status 500)', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'InternalServerError',
              message: 'Database connection failed',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      await expect(xrpc.getRecord('app.bsky.actor.profile', 'self')).rejects.toMatchObject({
        name: 'XrpcError',
        status: 500,
        error: 'InternalServerError',
        message: 'Database connection failed',
      })
    })

    it('handles non-JSON error responses gracefully', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      await expect(xrpc.getRecord('app.bsky.actor.profile', 'self')).rejects.toMatchObject({
        name: 'XrpcError',
        status: 502,
        error: 'UnknownError',
        message: 'Bad Gateway',
      })
    })
  })

  describe('listRecords', () => {
    it('queries records without pagination params when omitted', async () => {
      const mockResult = { records: [], cursor: undefined }
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const res = await xrpc.listRecords('app.bsky.actor.link')

      expect(res).toEqual(mockResult)
      const [path] = fakeFetch.mock.calls[0]!
      expect(path).toContain('/xrpc/com.atproto.repo.listRecords?')
      expect(path).toContain('collection=app.bsky.actor.link')
      expect(path).not.toContain('limit=')
      expect(path).not.toContain('cursor=')
    })

    it('includes limit and cursor query params when provided', async () => {
      const mockResult = {
        records: [{ uri: 'at://did/link/1', cid: 'cid1', value: {} }],
        cursor: 'next-page-token',
      }
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const res = await xrpc.listRecords('app.bsky.actor.link', { limit: 50, cursor: 'curr-token' })

      expect(res).toEqual(mockResult)
      const [path] = fakeFetch.mock.calls[0]!
      expect(path).toContain('limit=50')
      expect(path).toContain('cursor=curr-token')
    })
  })

  describe('putRecord', () => {
    it('sends POST request with record payload and returns StrongRef', async () => {
      const strongRef = { uri: `at://${testDid}/app.bsky.actor.link/tid123`, cid: 'cidLink' }
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(strongRef), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const record = { $type: 'app.bsky.actor.link', url: 'https://example.com' }
      const result = await xrpc.putRecord('app.bsky.actor.link', 'tid123', record)

      expect(result).toEqual(strongRef)
      expect(fakeFetch).toHaveBeenCalledTimes(1)
      const [path, init] = fakeFetch.mock.calls[0]!
      expect(path).toBe('/xrpc/com.atproto.repo.putRecord')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })

      const parsedBody = JSON.parse(init?.body as string)
      expect(parsedBody).toEqual({
        repo: testDid,
        collection: 'app.bsky.actor.link',
        rkey: 'tid123',
        record,
      })
      expect('swapRecord' in parsedBody).toBe(false)
      expect('validate' in parsedBody).toBe(false)
    })

    it('includes swapRecord when provided as string or null', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ uri: 'at://...', cid: '...' }), { status: 200 }),
        ),
      )
      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)

      // 1. swapRecord as CID string
      await xrpc.putRecord('app.bsky.actor.profile', 'self', {}, { swapRecord: 'bafycidold' })
      let parsed = JSON.parse(fakeFetch.mock.calls[0]![1]?.body as string)
      expect(parsed.swapRecord).toBe('bafycidold')

      // 2. swapRecord explicitly null ("must not exist yet")
      await xrpc.putRecord('app.bsky.actor.profile', 'self', {}, { swapRecord: null })
      parsed = JSON.parse(fakeFetch.mock.calls[1]![1]?.body as string)
      expect(parsed.swapRecord).toBeNull()

      // 3. validate flag provided
      await xrpc.putRecord('app.bsky.actor.profile', 'self', {}, { validate: false })
      parsed = JSON.parse(fakeFetch.mock.calls[2]![1]?.body as string)
      expect(parsed.validate).toBe(false)
      expect('swapRecord' in parsed).toBe(false)
    })
  })

  describe('deleteRecord', () => {
    it('sends POST request to deleteRecord', async () => {
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response('', { status: 200 })),
      )
      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)

      await xrpc.deleteRecord('app.bsky.actor.link', 'tid123', { swapRecord: 'bafycid' })

      const [path, init] = fakeFetch.mock.calls[0]!
      expect(path).toBe('/xrpc/com.atproto.repo.deleteRecord')
      expect(init?.method).toBe('POST')
      const body = JSON.parse(init?.body as string)
      expect(body).toEqual({
        repo: testDid,
        collection: 'app.bsky.actor.link',
        rkey: 'tid123',
        swapRecord: 'bafycid',
      })
    })
  })

  describe('uploadBlob', () => {
    it('uploads raw blob with content-type and returns BlobRef', async () => {
      const blobRef: BlobRef = {
        $type: 'blob',
        ref: { $link: 'bafkreicidblob' },
        mimeType: 'image/png',
        size: 1024,
      }
      const fakeFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ blob: blobRef }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
      const res = await xrpc.uploadBlob(blob)

      expect(res).toEqual(blobRef)
      const [path, init] = fakeFetch.mock.calls[0]!
      expect(path).toBe('/xrpc/com.atproto.repo.uploadBlob')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ 'Content-Type': 'image/png' })
      expect(init?.body).toBe(blob)
    })

    it('rejects a Blob with an empty type', async () => {
      const fakeFetch = vi.fn()
      const xrpc = createXrpc(fakeFetch, testDid, pdsUrl)
      const blob = new Blob(['sample data'], { type: '' })

      await expect(xrpc.uploadBlob(blob)).rejects.toThrow('Blob content type is required')
      expect(fakeFetch).not.toHaveBeenCalled()
    })
  })
})
