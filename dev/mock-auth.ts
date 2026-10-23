// Dev-only stand-in for the OAuth client, so signed-in screens can be rendered
// and screenshotted without an account. Loaded by src/oauth.ts behind
// import.meta.env.DEV and a ?mock query, so it never reaches a production build.
//
//   ?mock          signed in, 4 links, instant
//   ?mock=slow     the same, with delays on restore and load (loading states)
//   ?mock=out      signed out after the restore
//   ?mock=empty    signed in, no links
//   ?mock=full     signed in, 10 links
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { LINK_COLLECTION, PROFILE_COLLECTION, PUBLIC_APPVIEW } from '../src/lib/config'
import type { Auth } from '../src/oauth'
import type { BlobRef, Did, LinkRecord, ProfileRecord, RecordEnvelope, StrongRef, Xrpc } from '../src/lib/types'

const DID: Did = 'did:plc:mockjoselito'

const SAMPLE_LINKS: Array<{ url: string; title?: string; color?: string; letter?: string }> = [
  { url: 'https://joseli.to', title: 'joseli.to', color: '#2E6B3F', letter: 'J' },
  { url: 'https://notx.blue', title: 'notx.blue', color: '#1185FE', letter: 'N' },
  { url: 'https://ko-fi.com/joselito', title: 'Support me on Ko-fi' },
  { url: 'https://github.com/breakzplatform', color: '#000000', letter: 'G' },
  { url: 'https://example.org/a-rather-long-address/that-wraps/on-a-narrow-phone-screen', title: 'A link with a rather long title that should wrap', color: '#9333EA', letter: 'L' },
  { url: 'https://example.com/6', title: 'Six', color: '#DC2626', letter: '6' },
  { url: 'https://example.com/7', title: 'Seven', color: '#EA580C', letter: '7' },
  { url: 'https://example.com/8', title: 'Eight', color: '#CA8A04', letter: '8' },
  { url: 'https://example.com/9', title: 'Nine', color: '#15803D', letter: '9' },
  { url: 'https://example.com/10', title: 'Ten', color: '#DB2777', letter: 'X' },
]

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function iconDataUrl(color: string, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${color}"/><text x="32" y="44" font-family="system-ui" font-weight="700" font-size="34" text-anchor="middle" fill="#fff">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function avatarDataUrl(): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1185FE"/><circle cx="32" cy="26" r="11" fill="#fff"/><rect x="12" y="42" width="40" height="22" rx="11" fill="#fff"/></svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function createMockXrpc(count: number, delay: number): Xrpc {
  const links = new Map<string, RecordEnvelope<LinkRecord>>()
  const blobs = new Map<string, string>()
  let profile: RecordEnvelope<ProfileRecord> = {
    uri: `at://${DID}/${PROFILE_COLLECTION}/self`,
    cid: 'profile-0',
    value: { $type: 'app.bsky.actor.profile', links: [] },
  }
  let counter = 0

  const refOf = (rkey: string): StrongRef => {
    const entry = links.get(rkey)!
    return { uri: entry.uri, cid: entry.cid }
  }

  SAMPLE_LINKS.slice(0, count).forEach((sample, index) => {
    const rkey = `3mock${String(index).padStart(3, '0')}`
    const cid = `icon-${index}`
    const icon: BlobRef | undefined = sample.letter
      ? { $type: 'blob', ref: { $link: cid }, mimeType: 'image/png', size: 4200 }
      : undefined
    if (icon && sample.color && sample.letter) blobs.set(cid, iconDataUrl(sample.color, sample.letter))
    links.set(rkey, {
      uri: `at://${DID}/${LINK_COLLECTION}/${rkey}`,
      cid: `link-${index}`,
      value: {
        $type: 'app.bsky.actor.link',
        url: sample.url,
        ...(sample.title ? { title: sample.title } : {}),
        ...(icon ? { icon } : {}),
        createdAt: '2026-10-22T12:00:00.000Z',
      },
    })
    profile.value.links!.push(refOf(rkey))
  })

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  return {
    did: DID,
    async getRecord<T>(collection: string, rkey: string) {
      await pause(delay)
      if (collection === PROFILE_COLLECTION) return clone(profile) as unknown as RecordEnvelope<T>
      return (clone(links.get(rkey)) ?? null) as unknown as RecordEnvelope<T> | null
    },
    async listRecords<T>(collection: string) {
      await pause(delay)
      if (collection !== LINK_COLLECTION) return { records: [] }
      return { records: clone([...links.values()]) as unknown as RecordEnvelope<T>[] }
    },
    async putRecord(collection, rkey, record) {
      await pause(delay)
      counter += 1
      const cid = `put-${counter}`
      if (collection === PROFILE_COLLECTION) {
        profile = { uri: profile.uri, cid, value: clone(record) as ProfileRecord }
        return { uri: profile.uri, cid }
      }
      const uri = `at://${DID}/${collection}/${rkey}`
      links.set(rkey, { uri, cid, value: clone(record) as LinkRecord })
      return { uri, cid }
    },
    async deleteRecord(_collection, rkey) {
      await pause(delay)
      links.delete(rkey)
    },
    async uploadBlob(data) {
      await pause(delay)
      counter += 1
      const cid = `upload-${counter}`
      blobs.set(cid, URL.createObjectURL(data))
      return { $type: 'blob', ref: { $link: cid }, mimeType: data.type, size: data.size }
    },
    blobUrl(cid) {
      return blobs.get(cid) ?? iconDataUrl('#888888', '?')
    },
  }
}

export function createMockAuth(mode: string): Auth {
  const slow = mode === 'slow'
  const delay = slow ? 700 : 0
  const count = mode === 'empty' ? 0 : mode === 'full' ? 10 : 4
  const xrpc = createMockXrpc(count, delay)

  // fetchProfile reads the public AppView, which knows nothing about the mock DID.
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.startsWith(`${PUBLIC_APPVIEW}/xrpc/app.bsky.actor.getProfile`)) {
      return pause(delay).then(() => new Response(JSON.stringify({
        handle: 'joseli.to',
        displayName: 'Joselito',
        avatar: avatarDataUrl(),
      })))
    }
    return realFetch(input, init)
  }

  let signedIn = mode !== 'out'
  const session = { did: DID, async signOut() { signedIn = false } } as unknown as OAuthSession
  return {
    async init() {
      await pause(slow ? 1800 : 0)
      return signedIn ? session : undefined
    },
    async signIn() {
      await pause(slow ? 2500 : 600)
      signedIn = true
    },
    async signOut() {
      await pause(delay)
      signedIn = false
    },
    async xrpcFor() {
      return xrpc
    },
    onDeleted() {},
  }
}
