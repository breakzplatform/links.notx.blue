export type Did = `did:${string}`

export interface BlobRef {
  $type: 'blob'
  ref: { $link: string }
  mimeType: string
  size: number
}

export interface StrongRef {
  uri: string
  cid: string
}

export interface LinkRecord {
  $type: 'app.bsky.actor.link'
  url: string
  title?: string
  icon?: BlobRef
  createdAt: string
  labels?: unknown
  [key: string]: unknown
}

export interface ProfileRecord {
  $type: 'app.bsky.actor.profile'
  links?: StrongRef[]
  [key: string]: unknown
}

export interface RecordEnvelope<T> {
  uri: string
  cid: string
  value: T
}

export interface Xrpc {
  did: Did
  /** Resolves to null when the record does not exist. */
  getRecord<T>(collection: string, rkey: string): Promise<RecordEnvelope<T> | null>
  listRecords<T>(
    collection: string,
    opts?: { limit?: number; cursor?: string },
  ): Promise<{ records: RecordEnvelope<T>[]; cursor?: string }>
  /** `swapRecord: null` means the record must not exist yet; omit the key to skip the check. */
  putRecord(
    collection: string,
    rkey: string,
    record: unknown,
    opts?: { swapRecord?: string | null; validate?: boolean },
  ): Promise<StrongRef>
  deleteRecord(collection: string, rkey: string, opts?: { swapRecord?: string }): Promise<void>
  uploadBlob(data: Blob): Promise<BlobRef>
  /** PDS com.atproto.sync.getBlob URL, usable as an <img> src. */
  blobUrl(cid: string): string
}

export class XrpcError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
  ) {
    super(message)
    this.name = 'XrpcError'
  }
}
