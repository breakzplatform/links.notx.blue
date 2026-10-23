import { LINK_COLLECTION, PROFILE_COLLECTION } from './config'
import { MAX_PROFILE_LINKS, validateIcon, validateLink, validateTitle, type LinkIssue } from './rules'
import { XrpcError, type BlobRef, type LinkRecord, type ProfileRecord, type StrongRef, type Xrpc } from './types'

export class TooManyLinksError extends Error {
  constructor() { super('A profile can contain at most 10 links'); this.name = 'TooManyLinksError' }
}
export class ConcurrentEditError extends Error {
  constructor() { super('The profile was changed concurrently; please try again'); this.name = 'ConcurrentEditError' }
}
export class InvalidLinkError extends Error {
  constructor(public issues: LinkIssue[], message = 'Invalid link URL or title') {
    super(message)
    this.name = 'InvalidLinkError'
  }
}
export class PartialSaveError extends Error {
  constructor(public ref: StrongRef, public rkey: string, cause: unknown) {
    super('The link was saved but could not be added to the profile', { cause })
    this.name = 'PartialSaveError'
  }
}
export type SaveStep = 'upload' | 'link' | 'profile'
export function insertLink(links: StrongRef[], ref: StrongRef, index = links.length): StrongRef[] {
  if (links.length >= MAX_PROFILE_LINKS) throw new TooManyLinksError()
  const result = [...links]
  result.splice(Math.max(0, Math.min(index, result.length)), 0, ref)
  return result
}
export function replaceLink(links: StrongRef[], uri: string, ref: StrongRef): StrongRef[] {
  return links.map(link => link.uri === uri ? ref : link)
}
export function removeLink(links: StrongRef[], uri: string): StrongRef[] {
  return links.filter(link => link.uri !== uri)
}
export function moveLink(links: StrongRef[], uri: string, toIndex: number): StrongRef[] {
  const result = [...links]
  const index = result.findIndex(link => link.uri === uri)
  if (index < 0) return result
  const [ref] = result.splice(index, 1)
  if (ref) result.splice(Math.max(0, Math.min(toIndex, result.length)), 0, ref)
  return result
}
export function withLinks(profile: ProfileRecord | null, links: StrongRef[]): ProfileRecord {
  const result: ProfileRecord = { ...(profile ?? { $type: 'app.bsky.actor.profile' }) }
  if (links.length) result.links = links
  else delete result.links
  return result
}
function profileLinks(profile: ProfileRecord | null | undefined): StrongRef[] {
  return Array.isArray(profile?.links) ? profile.links.filter((ref): ref is StrongRef =>
    ref !== null && typeof ref === 'object' && typeof ref.uri === 'string' && typeof ref.cid === 'string') : []
}
export async function updateProfileLinks(xrpc: Xrpc, op: (links: StrongRef[]) => StrongRef[], maxAttempts = 3): Promise<StrongRef[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const current = await xrpc.getRecord<ProfileRecord>(PROFILE_COLLECTION, 'self')
    const previous = profileLinks(current?.value)
    const links = op(previous.map(ref => ({ ...ref })))
    if (links.length > MAX_PROFILE_LINKS) throw new TooManyLinksError()
    if (links.length === previous.length && links.every((ref, index) =>
      ref.uri === previous[index]!.uri && ref.cid === previous[index]!.cid)) return links
    try {
      await xrpc.putRecord(PROFILE_COLLECTION, 'self', withLinks(current?.value ?? null, links), { swapRecord: current?.cid ?? null })
      return links
    } catch (error) {
      if (!(error instanceof XrpcError) || error.error !== 'InvalidSwap') throw error
    }
  }
  throw new ConcurrentEditError()
}
export type LinkView = StrongRef & {
  rkey: string; iconUrl?: string; stale: boolean
} & ({ missing: true; record?: undefined } | { missing?: false; record: LinkRecord })

export async function loadLinks(xrpc: Xrpc): Promise<{ profileCid: string | null; shown: LinkView[]; hidden: LinkView[] }> {
  const profile = await xrpc.getRecord<ProfileRecord>(PROFILE_COLLECTION, 'self')
  const records = new Map<string, LinkView>()
  let cursor: string | undefined
  const cursors = new Set<string>()
  do {
    const page = await xrpc.listRecords<LinkRecord>(LINK_COLLECTION, { limit: 100, ...(cursor ? { cursor } : {}) })
    for (const entry of page.records) {
      const value = entry.value
      const valid = value !== null && typeof value === 'object' && !Array.isArray(value)
      const icon = valid ? value.icon as { ref?: { $link?: unknown }; cid?: unknown } | undefined : undefined
      const iconCid = typeof icon?.ref?.$link === 'string' ? icon.ref.$link : typeof icon?.cid === 'string' ? icon.cid : undefined
      records.set(entry.uri, {
        uri: entry.uri, cid: entry.cid, rkey: entry.uri.slice(entry.uri.lastIndexOf('/') + 1),
        ...(valid ? { record: value, stale: false } : { missing: true as const, stale: true }),
        ...(iconCid ? { iconUrl: xrpc.blobUrl(iconCid) } : {}),
      })
    }
    cursor = page.cursor
    if (cursor && cursors.has(cursor)) throw new Error('Repeated record pagination cursor')
    if (cursor) cursors.add(cursor)
  } while (cursor)
  const references = profileLinks(profile?.value)
  const shown: LinkView[] = references.map(ref => {
    const record = records.get(ref.uri)
    return record ? { ...record, stale: record.stale || ref.cid !== record.cid } : {
      ...ref, rkey: ref.uri.slice(ref.uri.lastIndexOf('/') + 1), stale: true, missing: true,
    }
  })
  const referenced = new Set(references.map(ref => ref.uri))
  return { profileCid: profile?.cid ?? null, shown, hidden: [...records.values()].filter(ref => !referenced.has(ref.uri)) }
}

let lastTimestamp = 0n
let clockId: bigint | undefined
export function generateTid(): string {
  clockId ??= BigInt(crypto.getRandomValues(new Uint16Array(1))[0]! & 1023)
  const now = BigInt(Date.now()) * 1000n
  lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1n
  let value = (lastTimestamp << 10n) | clockId
  const alphabet = '234567abcdefghijklmnopqrstuvwxyz'
  let tid = ''
  for (let index = 0; index < 13; index++) {
    tid = alphabet[Number(value & 31n)] + tid
    value >>= 5n
  }
  return tid
}
export async function saveLink(xrpc: Xrpc, input: {
  rkey?: string; url: string; title?: string; icon?: Blob | BlobRef | null; createdAt?: string
  onProgress?: (step: SaveStep, state: 'start' | 'done') => void
}): Promise<StrongRef> {
  const validation = validateLink(input.url, { existingCount: 0, editing: !!input.rkey })
  const title = validateTitle(input.title ?? '')
  if (!validation.url || title.issues.length) {
    throw new InvalidLinkError(validation.issues, `Invalid link URL or title${title.issues.length ? `: ${title.issues.join(', ')}` : ''}`)
  }
  const current = input.rkey ? await xrpc.getRecord<LinkRecord>(LINK_COLLECTION, input.rkey) : null
  const profile = await xrpc.getRecord<ProfileRecord>(PROFILE_COLLECTION, 'self')
  const references = profileLinks(profile?.value)
  const existingUri = input.rkey ? `at://${xrpc.did}/${LINK_COLLECTION}/${input.rkey}` : undefined
  if (!references.some(ref => ref.uri === existingUri) && references.length >= MAX_PROFILE_LINKS) throw new TooManyLinksError()
  const record: LinkRecord = {
    ...current?.value, $type: 'app.bsky.actor.link', url: validation.url,
    createdAt: current?.value.createdAt ?? input.createdAt ?? new Date().toISOString(),
  }
  if (title.value) record.title = title.value
  else delete record.title
  if (input.icon === null) delete record.icon
  else if (input.icon !== undefined) {
    const icon = input.icon
    const issues = validateIcon(icon instanceof Blob ? icon : { type: icon.mimeType, size: icon.size })
    if (issues.length) throw new Error(`Invalid icon: ${issues.join(', ')}`)
    if (icon instanceof Blob) {
      input.onProgress?.('upload', 'start')
      record.icon = await xrpc.uploadBlob(icon)
      input.onProgress?.('upload', 'done')
    } else record.icon = icon
  }
  const rkey = input.rkey ?? generateTid()
  let ref: StrongRef
  input.onProgress?.('link', 'start')
  try {
    ref = await xrpc.putRecord(LINK_COLLECTION, rkey, record, { swapRecord: current?.cid ?? null })
  } catch (error) {
    if (error instanceof XrpcError && error.error === 'InvalidSwap') throw new ConcurrentEditError()
    throw error
  }
  input.onProgress?.('link', 'done')
  input.onProgress?.('profile', 'start')
  try {
    await updateProfileLinks(xrpc, links => links.some(link => link.uri === ref.uri) ? replaceLink(links, ref.uri, ref) : insertLink(links, ref))
  } catch (error) {
    throw new PartialSaveError(ref, rkey, error)
  }
  input.onProgress?.('profile', 'done')
  return ref
}
function linkRkey(xrpc: Xrpc, uri: string): string {
  const prefix = `at://${xrpc.did}/${LINK_COLLECTION}/`
  if (!uri.startsWith(prefix) || !uri.slice(prefix.length) || uri.slice(prefix.length).includes('/')) throw new Error('Invalid link record URI')
  return uri.slice(prefix.length)
}
export async function restoreLink(xrpc: Xrpc, uri: string): Promise<StrongRef[]> {
  const current = await xrpc.getRecord<LinkRecord>(LINK_COLLECTION, linkRkey(xrpc, uri))
  if (!current) throw new Error('missing')
  const validation = validateLink(typeof current.value.url === 'string' ? current.value.url : '', { existingCount: 0, editing: true })
  if (validation.issues.length) throw new InvalidLinkError(validation.issues)
  const ref = { uri, cid: current.cid }
  return updateProfileLinks(xrpc, links => links.some(link => link.uri === uri) ? replaceLink(links, uri, ref) : insertLink(links, ref))
}
export async function deleteLink(xrpc: Xrpc, uri: string, cid?: string): Promise<void> {
  const rkey = linkRkey(xrpc, uri)
  await updateProfileLinks(xrpc, links => removeLink(links, uri))
  try {
    await xrpc.deleteRecord(LINK_COLLECTION, rkey, cid === undefined ? undefined : { swapRecord: cid })
  } catch (error) {
    if (error instanceof XrpcError) {
      if (error.error === 'RecordNotFound') return
      if (error.error === 'InvalidSwap') throw new ConcurrentEditError()
    }
    throw error
  }
}
export async function reorderLinks(xrpc: Xrpc, uri: string, toIndex: number): Promise<StrongRef[]> {
  return updateProfileLinks(xrpc, links => moveLink(links, uri, toIndex))
}
