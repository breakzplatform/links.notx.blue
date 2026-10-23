import { XrpcError, type BlobRef, type Did, type Xrpc } from './types'

// Bind fetchHandler to its OAuthSession: the handler uses `this`.
export function createXrpc(
  fetchHandler: (pathname: string, init?: RequestInit) => Promise<Response>,
  did: Did,
  pdsUrl: string,
): Xrpc {
  async function request<T>(method: string, query?: Record<string, string>, body?: unknown, blob?: Blob): Promise<T> {
    const path = `/xrpc/${method}${query ? `?${new URLSearchParams(query)}` : ''}`
    const response = await fetchHandler(path, body !== undefined || blob ? {
      method: 'POST',
      headers: { 'Content-Type': blob ? blob.type : 'application/json' },
      body: blob ?? JSON.stringify(body),
    } : undefined)
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string; message?: string }
      throw new XrpcError(response.status, error.error ?? 'UnknownError', error.message ?? response.statusText)
    }
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
  return {
    did,
    async getRecord<T>(collection: string, rkey: string) {
      try {
        return await request<import('./types').RecordEnvelope<T>>('com.atproto.repo.getRecord', { repo: did, collection, rkey })
      } catch (error) {
        if (error instanceof XrpcError && error.error === 'RecordNotFound') return null
        throw error
      }
    },
    listRecords(collection, opts = {}) {
      const query: Record<string, string> = { repo: did, collection }
      if (opts.limit !== undefined) query.limit = String(opts.limit)
      if (opts.cursor !== undefined) query.cursor = opts.cursor
      return request('com.atproto.repo.listRecords', query)
    },
    putRecord(collection, rkey, record, opts = {}) {
      const body: Record<string, unknown> = { repo: did, collection, rkey, record }
      if ('swapRecord' in opts) body.swapRecord = opts.swapRecord
      if (opts.validate !== undefined) body.validate = opts.validate
      return request('com.atproto.repo.putRecord', undefined, body)
    },
    deleteRecord(collection, rkey, opts = {}) {
      return request('com.atproto.repo.deleteRecord', undefined, { repo: did, collection, rkey, ...opts })
    },
    async uploadBlob(data) {
      if (!data.type) throw new Error('Blob content type is required')
      return (await request<{ blob: BlobRef }>('com.atproto.repo.uploadBlob', undefined, undefined, data)).blob
    },
    blobUrl(cid) {
      const url = new URL('/xrpc/com.atproto.sync.getBlob', pdsUrl)
      url.search = new URLSearchParams({ did, cid }).toString()
      return url.href
    },
  }
}
