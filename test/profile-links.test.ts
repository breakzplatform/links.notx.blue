import { describe, expect, it, vi } from 'vitest'
import { LINK_COLLECTION, PROFILE_COLLECTION } from '../src/lib/config'
import {
  ConcurrentEditError,
  deleteLink,
  generateTid,
  insertLink,
  InvalidLinkError,
  loadLinks,
  moveLink,
  PartialSaveError,
  removeLink,
  reorderLinks,
  replaceLink,
  restoreLink,
  saveLink,
  TooManyLinksError,
  updateProfileLinks,
  withLinks,
} from '../src/lib/profile-links'
import {
  type BlobRef,
  type Did,
  type LinkRecord,
  type ProfileRecord,
  type StrongRef,
  type Xrpc,
  XrpcError,
} from '../src/lib/types'
import { createXrpc } from '../src/lib/xrpc'

function makeFakeXrpc(did: Did = 'did:plc:alice123'): {
  xrpc: Xrpc
  calls: { method: string; args: unknown[] }[]
  state: {
    profile: { cid: string; value: ProfileRecord } | null
    links: Map<string, { cid: string; value: LinkRecord }>
    blobs: Map<string, BlobRef>
  }
} {
  const calls: { method: string; args: unknown[] }[] = []
  const state = {
    profile: null as { cid: string; value: ProfileRecord } | null,
    links: new Map<string, { cid: string; value: LinkRecord }>(),
    blobs: new Map<string, BlobRef>(),
  }

  const xrpc: Xrpc = {
    did,
    async getRecord<T>(collection: string, rkey: string) {
      calls.push({ method: 'getRecord', args: [collection, rkey] })
      if (collection === PROFILE_COLLECTION && rkey === 'self') {
        if (!state.profile) return null
        return {
          uri: `at://${did}/${PROFILE_COLLECTION}/self`,
          cid: state.profile.cid,
          value: JSON.parse(JSON.stringify(state.profile.value)),
        } as unknown as import('../src/lib/types').RecordEnvelope<T>
      }
      if (collection === LINK_COLLECTION) {
        const entry = state.links.get(rkey)
        if (!entry) return null
        return {
          uri: `at://${did}/${LINK_COLLECTION}/${rkey}`,
          cid: entry.cid,
          value: JSON.parse(JSON.stringify(entry.value)),
        } as unknown as import('../src/lib/types').RecordEnvelope<T>
      }
      return null
    },
    async listRecords<T>(collection: string) {
      calls.push({ method: 'listRecords', args: [collection] })
      if (collection === LINK_COLLECTION) {
        const records = Array.from(state.links.entries()).map(([rkey, { cid, value }]) => ({
          uri: `at://${did}/${LINK_COLLECTION}/${rkey}`,
          cid,
          value: JSON.parse(JSON.stringify(value)),
        }))
        return { records } as unknown as { records: import('../src/lib/types').RecordEnvelope<T>[]; cursor?: string }
      }
      return { records: [] }
    },
    async putRecord(collection: string, rkey: string, record: unknown, opts = {}) {
      calls.push({ method: 'putRecord', args: [collection, rkey, record, opts] })
      const cid = `bafy_cid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      if (collection === PROFILE_COLLECTION && rkey === 'self') {
        const currentCid = state.profile?.cid ?? null
        if ('swapRecord' in opts && opts.swapRecord !== undefined) {
          if (opts.swapRecord !== currentCid) {
            throw new XrpcError(400, 'InvalidSwap', 'Swap record mismatch')
          }
        }
        state.profile = { cid, value: record as ProfileRecord }
        return { uri: `at://${did}/${PROFILE_COLLECTION}/self`, cid }
      }
      if (collection === LINK_COLLECTION) {
        const current = state.links.get(rkey)
        if ('swapRecord' in opts && opts.swapRecord !== undefined) {
          if (opts.swapRecord !== (current?.cid ?? null)) {
            throw new XrpcError(400, 'InvalidSwap', 'Swap record mismatch')
          }
        }
        state.links.set(rkey, { cid, value: record as LinkRecord })
        return { uri: `at://${did}/${LINK_COLLECTION}/${rkey}`, cid }
      }
      return { uri: `at://${did}/${collection}/${rkey}`, cid }
    },
    async deleteRecord(collection: string, rkey: string, opts?: { swapRecord?: string }) {
      calls.push({ method: 'deleteRecord', args: [collection, rkey, opts] })
      if (collection === LINK_COLLECTION) {
        state.links.delete(rkey)
      }
    },
    async uploadBlob(data: Blob) {
      calls.push({ method: 'uploadBlob', args: [data] })
      const cid = `bafkrei_blob_${state.blobs.size + 1}`
      const blobRef: BlobRef = {
        $type: 'blob',
        ref: { $link: cid },
        mimeType: data.type,
        size: data.size,
      }
      state.blobs.set(cid, blobRef)
      return blobRef
    },
    blobUrl(cid: string) {
      calls.push({ method: 'blobUrl', args: [cid] })
      return `https://pds.example.com/blob/${cid}`
    },
  }

  return { xrpc, calls, state }
}

describe('profile-links: pure link array operations', () => {
  const ref1: StrongRef = { uri: 'at://did/link/1', cid: 'cid1' }
  const ref2: StrongRef = { uri: 'at://did/link/2', cid: 'cid2' }
  const ref3: StrongRef = { uri: 'at://did/link/3', cid: 'cid3' }

  it('insertLink appends by default and preserves immutability', () => {
    const original = [ref1, ref2]
    const updated = insertLink(original, ref3)
    expect(updated).toEqual([ref1, ref2, ref3])
    expect(original).toEqual([ref1, ref2])
  })

  it('insertLink inserts at specific index', () => {
    const res = insertLink([ref1, ref2], ref3, 1)
    expect(res).toEqual([ref1, ref3, ref2])
  })

  it('insertLink throws TooManyLinksError when inserting beyond 10 links', () => {
    const tenLinks: StrongRef[] = Array.from({ length: 10 }, (_, i) => ({
      uri: `at://did/link/${i}`,
      cid: `cid${i}`,
    }))
    expect(() => insertLink(tenLinks, ref1)).toThrow(TooManyLinksError)
  })

  it('replaceLink replaces matching uri and leaves others untouched', () => {
    const initial = [ref1, ref2]
    const newRef2: StrongRef = { uri: 'at://did/link/2', cid: 'cid2_updated' }
    const res = replaceLink(initial, ref2.uri, newRef2)
    expect(res).toEqual([ref1, newRef2])
    expect(initial[1]?.cid).toBe('cid2') // immutability
  })

  it('removeLink removes matching uri without mutating input', () => {
    const initial = [ref1, ref2, ref3]
    const res = removeLink(initial, ref2.uri)
    expect(res).toEqual([ref1, ref3])
    expect(initial.length).toBe(3)
  })

  it('moveLink reorders element and preserves immutability', () => {
    const initial = [ref1, ref2, ref3]
    const moved = moveLink(initial, ref1.uri, 2)
    expect(moved).toEqual([ref2, ref3, ref1])
    expect(initial[0]).toBe(ref1)

    const movedToStart = moveLink(moved, ref1.uri, 0)
    expect(movedToStart).toEqual([ref1, ref2, ref3])
  })
})

describe('profile-links: withLinks', () => {
  it('creates a new profile record if profile is null', () => {
    const links: StrongRef[] = [{ uri: 'at://did/link/1', cid: 'cid1' }]
    const profile = withLinks(null, links)
    expect(profile).toEqual({
      $type: 'app.bsky.actor.profile',
      links,
    })
  })

  it('preserves every other field including unknown keys and blob JSON', () => {
    const existing: ProfileRecord = {
      $type: 'app.bsky.actor.profile',
      displayName: 'Alice Wonderland',
      description: 'Bio text with emojis 🍄',
      avatar: {
        $type: 'blob',
        ref: { $link: 'bafkreiavatar' },
        mimeType: 'image/jpeg',
        size: 54321,
      },
      banner: {
        $type: 'blob',
        ref: { $link: 'bafkreibanner' },
        mimeType: 'image/png',
        size: 98765,
      },
      pinnedPost: {
        uri: 'at://did/app.bsky.feed.post/3kabc',
        cid: 'bafyreipost',
      },
      labels: { values: [{ val: 'test' }] },
      joinedViaStarterPack: {
        uri: 'at://did/app.bsky.graph.starterpack/pack1',
        cid: 'bafyreipack',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      unknownCustomField: 'customValue123',
      nestedUnknown: { a: 1, b: [true, false] },
      links: [{ uri: 'at://did/link/old', cid: 'oldCid' }],
    }

    const newLinks: StrongRef[] = [{ uri: 'at://did/link/new', cid: 'newCid' }]
    const updated = withLinks(existing, newLinks)

    expect(updated.links).toEqual(newLinks)
    expect(updated.displayName).toBe('Alice Wonderland')
    expect(updated.description).toBe('Bio text with emojis 🍄')
    expect(updated.avatar).toEqual(existing.avatar)
    expect(updated.banner).toEqual(existing.banner)
    expect(updated.pinnedPost).toEqual(existing.pinnedPost)
    expect(updated.labels).toEqual(existing.labels)
    expect(updated.joinedViaStarterPack).toEqual(existing.joinedViaStarterPack)
    expect(updated.createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(updated.unknownCustomField).toBe('customValue123')
    expect(updated.nestedUnknown).toEqual({ a: 1, b: [true, false] })
  })

  it('omits the links key when given an empty links array and preserves other fields', () => {
    const existing: ProfileRecord = {
      $type: 'app.bsky.actor.profile',
      displayName: 'Alice',
      links: [{ uri: 'at://did/link/1', cid: 'cid1' }],
      customField: 'preserved',
    }

    const updated = withLinks(existing, [])
    expect('links' in updated).toBe(false)
    expect(updated.links).toBeUndefined()
    expect(updated.displayName).toBe('Alice')
    expect(updated.customField).toBe('preserved')

    const fromNull = withLinks(null, [])
    expect('links' in fromNull).toBe(false)
    expect(fromNull).toEqual({ $type: 'app.bsky.actor.profile' })
  })
})

describe('profile-links: updateProfileLinks', () => {
  it('sends swapRecord cid when profile exists', async () => {
    const { xrpc, state, calls } = makeFakeXrpc()
    state.profile = {
      cid: 'bafyInitialCid',
      value: { $type: 'app.bsky.actor.profile', displayName: 'User', links: [] },
    }

    const newRef: StrongRef = { uri: 'at://did/link/1', cid: 'cid1' }
    const result = await updateProfileLinks(xrpc, links => [...links, newRef])

    expect(result).toEqual([newRef])
    const putCall = calls.find(c => c.method === 'putRecord')
    expect(putCall).toBeDefined()
    expect(putCall?.args[3]).toEqual({ swapRecord: 'bafyInitialCid' })
  })

  it('sends swapRecord null when profile does not exist yet', async () => {
    const { xrpc, state, calls } = makeFakeXrpc()
    state.profile = null

    const newRef: StrongRef = { uri: 'at://did/link/1', cid: 'cid1' }
    const result = await updateProfileLinks(xrpc, () => [newRef])

    expect(result).toEqual([newRef])
    const putCall = calls.find(c => c.method === 'putRecord')
    expect(putCall).toBeDefined()
    expect(putCall?.args[3]).toEqual({ swapRecord: null })
  })

  it('retries on InvalidSwap and succeeds on updated data', async () => {
    const { xrpc, state } = makeFakeXrpc()
    state.profile = {
      cid: 'cid1',
      value: { $type: 'app.bsky.actor.profile', links: [] },
    }

    let attempt = 0
    const originalPut = xrpc.putRecord.bind(xrpc)
    xrpc.putRecord = vi.fn().mockImplementation(async (coll, rkey, record, opts) => {
      attempt++
      if (attempt === 1) {
        // simulate concurrent edit changing the record cid
        state.profile = {
          cid: 'cid2',
          value: {
            $type: 'app.bsky.actor.profile',
            links: [{ uri: 'at://did/link/concurrent', cid: 'cidConc' }],
          },
        }
        throw new XrpcError(400, 'InvalidSwap', 'Swap failed')
      }
      return originalPut(coll, rkey, record, opts)
    })

    const newRef: StrongRef = { uri: 'at://did/link/my', cid: 'cidMy' }
    const links = await updateProfileLinks(xrpc, curr => [...curr, newRef])

    expect(attempt).toBe(2)
    expect(links).toEqual([
      { uri: 'at://did/link/concurrent', cid: 'cidConc' },
      newRef,
    ])
  })

  it('throws ConcurrentEditError when maxAttempts exceeded', async () => {
    const { xrpc, state } = makeFakeXrpc()
    state.profile = { cid: 'c1', value: { $type: 'app.bsky.actor.profile', links: [] } }

    xrpc.putRecord = vi.fn().mockRejectedValue(new XrpcError(400, 'InvalidSwap', 'Swap failed'))

    const newRef: StrongRef = { uri: 'at://did/link/1', cid: 'cid1' }
    await expect(updateProfileLinks(xrpc, l => [...l, newRef], 3)).rejects.toThrow(ConcurrentEditError)
    expect(xrpc.putRecord).toHaveBeenCalledTimes(3)
  })

  it('skips putRecord when op result equals current links (no-op)', async () => {
    const { xrpc, state, calls } = makeFakeXrpc()
    const currentLinks: StrongRef[] = [
      { uri: 'at://did/link/1', cid: 'cid1' },
      { uri: 'at://did/link/2', cid: 'cid2' },
    ]
    state.profile = {
      cid: 'prof1',
      value: { $type: 'app.bsky.actor.profile', links: currentLinks },
    }

    const res = await updateProfileLinks(xrpc, l => l)
    expect(res).toEqual(currentLinks)
    expect(calls.filter(c => c.method === 'putRecord')).toHaveLength(0)
  })

  it('skips putRecord when result is empty and current profile has no links key or no profile', async () => {
    const { xrpc, state, calls } = makeFakeXrpc()
    state.profile = {
      cid: 'prof1',
      value: { $type: 'app.bsky.actor.profile' },
    }

    const res = await updateProfileLinks(xrpc, () => [])
    expect(res).toEqual([])
    expect(calls.filter(c => c.method === 'putRecord')).toHaveLength(0)

    state.profile = null
    const resNull = await updateProfileLinks(xrpc, () => [])
    expect(resNull).toEqual([])
    expect(calls.filter(c => c.method === 'putRecord')).toHaveLength(0)
  })

  it('omits the links key and preserves other fields when result is empty and profile had links', async () => {
    const { xrpc, state, calls } = makeFakeXrpc()
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        displayName: 'Bob',
        description: 'Bio',
        customField: 'preserved',
        links: [{ uri: 'at://did/link/1', cid: 'cid1' }],
      },
    }

    const res = await updateProfileLinks(xrpc, () => [])
    expect(res).toEqual([])
    const putCall = calls.find(c => c.method === 'putRecord' && c.args[0] === PROFILE_COLLECTION)
    expect(putCall).toBeDefined()
    const writtenRecord = putCall!.args[2] as ProfileRecord
    expect('links' in writtenRecord).toBe(false)
    expect(writtenRecord.links).toBeUndefined()
    expect(writtenRecord.displayName).toBe('Bob')
    expect(writtenRecord.description).toBe('Bio')
    expect(writtenRecord.customField).toBe('preserved')
  })

  it('tolerates non-array links and malformed entries in profile record', async () => {
    const { xrpc, state } = makeFakeXrpc()
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: 'not-an-array' as unknown as StrongRef[],
      },
    }

    const newRef: StrongRef = { uri: 'at://did/link/new', cid: 'cidNew' }
    const res = await updateProfileLinks(xrpc, l => [...l, newRef])
    expect(res).toEqual([newRef])

    state.profile = {
      cid: 'prof2',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [
          null,
          'string',
          { uri: 123 },
          { cid: null },
          { uri: 'at://did/link/valid', cid: 'cidValid' },
        ] as unknown as StrongRef[],
      },
    }
    const resFiltered = await updateProfileLinks(xrpc, l => l)
    expect(resFiltered).toEqual([{ uri: 'at://did/link/valid', cid: 'cidValid' }])
  })

  it('throws TooManyLinksError if op returns more than 10 links', async () => {
    const { xrpc } = makeFakeXrpc()
    const elevenLinks: StrongRef[] = Array.from({ length: 11 }, (_, i) => ({
      uri: `at://did/link/${i}`,
      cid: `cid${i}`,
    }))

    await expect(updateProfileLinks(xrpc, () => elevenLinks)).rejects.toThrow(TooManyLinksError)
  })
})

describe('profile-links: loadLinks', () => {
  it('correctly categorizes shown (in profile), hidden (unreferenced), and stale/missing links', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:testuser')
    const rkey1 = '3klink1'
    const rkey2 = '3klink2'
    const rkey3 = '3klink3'
    const rkeyMissing = '3klinkMissing'

    const uri1 = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey1}`
    const uri2 = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey2}`
    const uri3 = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey3}`
    const uriMissing = `at://${xrpc.did}/${LINK_COLLECTION}/${rkeyMissing}`

    // PDS has link 1, 2, and 3
    state.links.set(rkey1, {
      cid: 'cid1_fresh',
      value: {
        $type: 'app.bsky.actor.link',
        url: 'https://example.com/1',
        createdAt: '2024-01-01T00:00:00Z',
        icon: {
          $type: 'blob',
          ref: { $link: 'bafkrei_icon1' },
          mimeType: 'image/png',
          size: 1234,
        },
      },
    })
    state.links.set(rkey2, {
      cid: 'cid2_fresh',
      value: {
        $type: 'app.bsky.actor.link',
        url: 'https://example.com/2',
        createdAt: '2024-01-01T00:00:00Z',
      },
    })
    state.links.set(rkey3, {
      cid: 'cid3_fresh',
      value: {
        $type: 'app.bsky.actor.link',
        url: 'https://example.com/3',
        createdAt: '2024-01-01T00:00:00Z',
      },
    })

    // Profile references link 1 (matching CID), link 2 (old CID -> stale), and linkMissing (not in repo -> missing)
    state.profile = {
      cid: 'profileCid1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [
          { uri: uri1, cid: 'cid1_fresh' },
          { uri: uri2, cid: 'cid2_old' },
          { uri: uriMissing, cid: 'cidMissing' },
        ],
      },
    }

    const { profileCid, shown, hidden } = await loadLinks(xrpc)

    expect(profileCid).toBe('profileCid1')
    expect(shown).toHaveLength(3)

    // Shown #1: fresh link with icon
    expect(shown[0]?.uri).toBe(uri1)
    expect(shown[0]?.stale).toBe(false)
    expect(shown[0]?.missing).toBeFalsy()
    expect(shown[0]?.iconUrl).toBe('https://pds.example.com/blob/bafkrei_icon1')

    // Shown #2: stale link (CID mismatch)
    expect(shown[1]?.uri).toBe(uri2)
    expect(shown[1]?.stale).toBe(true)
    expect(shown[1]?.missing).toBeFalsy()

    // Shown #3: missing link (in profile, but missing in repository)
    expect(shown[2]?.uri).toBe(uriMissing)
    expect(shown[2]?.stale).toBe(true)
    expect(shown[2]?.missing).toBe(true)
    expect(shown[2]?.record).toBeUndefined()

    // Hidden: link 3 is in repository but NOT in profile
    expect(hidden).toHaveLength(1)
    expect(hidden[0]?.uri).toBe(uri3)
  })

  it('paginates listRecords and detects infinite loop cursor', async () => {
    const { xrpc } = makeFakeXrpc()
    let pageCount = 0
    xrpc.listRecords = vi.fn().mockImplementation(async (_coll, opts) => {
      pageCount++
      if (!opts?.cursor) {
        return {
          records: [{ uri: 'at://did/link/1', cid: 'c1', value: { url: 'https://a.com' } }],
          cursor: 'page2',
        }
      }
      return {
        records: [{ uri: 'at://did/link/2', cid: 'c2', value: { url: 'https://b.com' } }],
        cursor: undefined,
      }
    })

    const res = await loadLinks(xrpc)
    expect(pageCount).toBe(2)
    expect(res.hidden).toHaveLength(2)

    // Repeated cursor throws error
    xrpc.listRecords = vi.fn().mockResolvedValue({
      records: [],
      cursor: 'loopCursor',
    })
    await expect(loadLinks(xrpc)).rejects.toThrow('Repeated record pagination cursor')
  })

  it('tolerates legacy icon.cid, malformed icons, and non-object record values', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const rkeyLegacy = 'legacyIcon'
    const rkeyMalformed = 'malformedIcon'
    const rkeyNonObject = 'nonObjectRecord'

    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [
          { uri: `at://${xrpc.did}/${LINK_COLLECTION}/${rkeyLegacy}`, cid: 'cid1' },
          { uri: `at://${xrpc.did}/${LINK_COLLECTION}/${rkeyMalformed}`, cid: 'cid2' },
          { uri: `at://${xrpc.did}/${LINK_COLLECTION}/${rkeyNonObject}`, cid: 'cid3' },
        ],
      },
    }

    // 1. legacy icon with { cid: string }
    state.links.set(rkeyLegacy, {
      cid: 'cid1',
      value: {
        $type: 'app.bsky.actor.link',
        url: 'https://example.com/1',
        createdAt: '2024-01-01',
        icon: { cid: 'bafk_legacy_cid' } as unknown as BlobRef,
      },
    })

    // 2. malformed icon (e.g. string)
    state.links.set(rkeyMalformed, {
      cid: 'cid2',
      value: {
        $type: 'app.bsky.actor.link',
        url: 'https://example.com/2',
        createdAt: '2024-01-01',
        icon: 'bad-icon' as unknown as BlobRef,
      },
    })

    // 3. non-object record value (e.g. string)
    state.links.set(rkeyNonObject, {
      cid: 'cid3',
      value: 'not-an-object' as unknown as LinkRecord,
    })

    const { shown } = await loadLinks(xrpc)
    expect(shown).toHaveLength(3)

    // Legacy icon resolves iconUrl
    expect(shown[0]?.iconUrl).toBe(xrpc.blobUrl('bafk_legacy_cid'))

    // Malformed icon has no iconUrl
    expect(shown[1]?.iconUrl).toBeUndefined()
    expect(shown[1]?.record?.url).toBe('https://example.com/2')

    // Non-object record is handled safely as missing / stale
    expect(shown[2]?.missing).toBe(true)
    expect(shown[2]?.stale).toBe(true)
  })
})

describe('profile-links: saveLink call order and behavior', () => {
  it('executes in exact order: uploadBlob -> putRecord link -> updateProfileLinks', async () => {
    const { xrpc, calls } = makeFakeXrpc('did:plc:alice')
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

    const ref = await saveLink(xrpc, {
      url: 'https://example.com/blog',
      title: 'My Blog',
      icon: blob,
    })

    expect(ref.uri).toMatch(/^at:\/\/did:plc:alice\/app\.bsky\.actor\.link\//)

    const methodNames = calls.map(c => c.method)
    // 1. uploadBlob
    const uploadIndex = methodNames.indexOf('uploadBlob')
    // 2. putRecord for link
    const putLinkIndex = methodNames.findIndex(
      (m, i) => m === 'putRecord' && calls[i]?.args[0] === LINK_COLLECTION,
    )
    // 3. getRecord / putRecord for profile
    const putProfileIndex = methodNames.findIndex(
      (m, i) => m === 'putRecord' && calls[i]?.args[0] === PROFILE_COLLECTION,
    )

    expect(uploadIndex).toBeGreaterThanOrEqual(0)
    expect(putLinkIndex).toBeGreaterThan(uploadIndex)
    expect(putProfileIndex).toBeGreaterThan(putLinkIndex)
  })

  it('preserves existing record fields and updates profile on edit', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const rkey = 'existingRkey'
    const initialLink: LinkRecord = {
      $type: 'app.bsky.actor.link',
      url: 'https://example.com/initial',
      title: 'Initial Title',
      createdAt: '2023-01-01T00:00:00Z',
      unknownField: 'preserveMe',
      labels: { $type: 'com.atproto.label.defs#selfLabels', values: [] },
    }
    state.links.set(rkey, { cid: 'cidOld', value: initialLink })

    const existingUri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`
    state.profile = {
      cid: 'profileCid',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri: existingUri, cid: 'cidOld' }],
      },
    }

    const ref = await saveLink(xrpc, {
      rkey,
      url: 'https://example.com/updated',
      title: 'New Title',
      icon: null, // removes icon
    })

    expect(ref.uri).toBe(existingUri)
    const saved = state.links.get(rkey)
    expect(saved?.value.url).toBe('https://example.com/updated')
    expect(saved?.value.title).toBe('New Title')
    expect(saved?.value.unknownField).toBe('preserveMe')
    expect(saved?.value.createdAt).toBe('2023-01-01T00:00:00Z')
    expect(saved?.value.icon).toBeUndefined()

    // Profile link replaced
    expect(state.profile?.value.links).toEqual([{ uri: existingUri, cid: ref.cid }])
  })

  it('works with real createXrpc wired to mock fetchHandler', async () => {
    const executedRequests: { path: string; method: string }[] = []
    const fakeFetchHandler = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
      executedRequests.push({ path, method: init?.method ?? 'GET' })

      if (path === '/xrpc/com.atproto.repo.uploadBlob') {
        return new Response(
          JSON.stringify({
            blob: {
              $type: 'blob',
              ref: { $link: 'bafkreiblob123' },
              mimeType: 'image/png',
              size: 50,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (path === '/xrpc/com.atproto.repo.putRecord') {
        const body = JSON.parse(init?.body as string)
        return new Response(
          JSON.stringify({
            uri: `at://did:plc:bob/${body.collection}/${body.rkey}`,
            cid: `cid_${body.collection}`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (path.startsWith('/xrpc/com.atproto.repo.getRecord')) {
        return new Response(
          JSON.stringify({
            error: 'RecordNotFound',
            message: 'Not found',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('{}', { status: 200 })
    })

    const xrpc = createXrpc(fakeFetchHandler, 'did:plc:bob', 'https://pds.example.com')
    const blob = new Blob([new Uint8Array([9, 9, 9])], { type: 'image/png' })

    await saveLink(xrpc, {
      url: 'https://alice.itch.io',
      title: 'Itch Games',
      icon: blob,
    })

    const paths = executedRequests.map(r => r.path)
    expect(paths).toHaveLength(5)
    expect(paths[0]).toContain('/xrpc/com.atproto.repo.getRecord?') // get profile/self to check 10-link cap
    expect(paths[0]).toContain('collection=app.bsky.actor.profile')
    expect(paths[1]).toBe('/xrpc/com.atproto.repo.uploadBlob')
    expect(paths[2]).toBe('/xrpc/com.atproto.repo.putRecord') // link putRecord
    expect(paths[3]).toContain('/xrpc/com.atproto.repo.getRecord?') // get profile/self in updateProfileLinks
    expect(paths[4]).toBe('/xrpc/com.atproto.repo.putRecord') // profile putRecord
  })

  it('checks 10-link cap before uploadBlob and putRecord, making no write calls', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const tenLinks: StrongRef[] = Array.from({ length: 10 }, (_, i) => ({
      uri: `at://${xrpc.did}/${LINK_COLLECTION}/link${i}`,
      cid: `cid${i}`,
    }))
    state.profile = {
      cid: 'prof1',
      value: { $type: 'app.bsky.actor.profile', links: tenLinks },
    }
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    await expect(saveLink(xrpc, {
      url: 'https://example.com/new-link',
      title: 'New Link',
      icon: blob,
    })).rejects.toThrow(TooManyLinksError)

    // Assert NO write calls happened
    const uploadCalls = calls.filter(c => c.method === 'uploadBlob')
    const putCalls = calls.filter(c => c.method === 'putRecord')
    expect(uploadCalls).toHaveLength(0)
    expect(putCalls).toHaveLength(0)
  })

  it('throws TooManyLinksError before writing when editing an rkey not referenced by the profile with 10 links', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const tenLinks: StrongRef[] = Array.from({ length: 10 }, (_, i) => ({
      uri: `at://${xrpc.did}/${LINK_COLLECTION}/link${i}`,
      cid: `cid${i}`,
    }))
    state.profile = {
      cid: 'prof1',
      value: { $type: 'app.bsky.actor.profile', links: tenLinks },
    }
    state.links.set('unreferencedRkey', {
      cid: 'cidUnref',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })
    await expect(saveLink(xrpc, {
      rkey: 'unreferencedRkey',
      url: 'https://example.com/updated',
    })).rejects.toThrow(TooManyLinksError)

    expect(calls.filter(c => c.method === 'putRecord')).toHaveLength(0)
  })

  it('allows editing an existing referenced link even when profile already has 10 links', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const rkey = 'link0'
    const tenLinks: StrongRef[] = Array.from({ length: 10 }, (_, i) => ({
      uri: `at://${xrpc.did}/${LINK_COLLECTION}/link${i}`,
      cid: `cid${i}`,
    }))
    state.profile = {
      cid: 'prof1',
      value: { $type: 'app.bsky.actor.profile', links: tenLinks },
    }
    state.links.set(rkey, {
      cid: 'cid0',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })

    const result = await saveLink(xrpc, {
      rkey,
      url: 'https://example.com/updated',
      title: 'Updated Link',
    })
    expect(result.uri).toBe(`at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`)
  })

  it('maps link putRecord XrpcError InvalidSwap to ConcurrentEditError in saveLink', async () => {
    const { xrpc } = makeFakeXrpc()
    xrpc.putRecord = vi.fn().mockRejectedValue(new XrpcError(400, 'InvalidSwap', 'Swap mismatch on link'))

    await expect(saveLink(xrpc, {
      url: 'https://example.com',
      title: 'Example',
    })).rejects.toThrow(ConcurrentEditError)
  })

  it('throws on invalid URL, title, or icon', async () => {
    const { xrpc } = makeFakeXrpc()

    // Invalid url
    await expect(saveLink(xrpc, { url: 'not-a-valid-url' })).rejects.toThrow('Invalid link URL or title')

    // Invalid title (over 40 graphemes)
    await expect(
      saveLink(xrpc, { url: 'https://example.com', title: 'a'.repeat(45) }),
    ).rejects.toThrow('Invalid link URL or title')

    // Invalid icon (unsupported mime)
    const badBlob = new Blob(['bad'], { type: 'image/gif' })
    await expect(
      saveLink(xrpc, { url: 'https://example.com', icon: badBlob }),
    ).rejects.toThrow(/Invalid icon: bad-type/)
  })

  it('InvalidLinkError carries issues for a bad URL', async () => {
    const { xrpc } = makeFakeXrpc()

    try {
      await saveLink(xrpc, { url: 'http://example.com' })
      expect.unreachable('Should have thrown InvalidLinkError for http URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues).toContain('insecure')
    }

    try {
      await saveLink(xrpc, { url: 'https://bit.ly/test' })
      expect.unreachable('Should have thrown InvalidLinkError for shortener URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues).toContain('shortener')
    }

    try {
      await saveLink(xrpc, { url: 'invalid-url' })
      expect.unreachable('Should have thrown InvalidLinkError for invalid URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues.length).toBeGreaterThan(0)
    }
  })

  it('saveLink emits onProgress in correct order (upload only for Blob icon, link, profile)', async () => {
    const { xrpc } = makeFakeXrpc()

    // 1. With Blob icon
    const blobProgress: [string, string][] = []
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    await saveLink(xrpc, {
      url: 'https://example.com/blob-icon',
      title: 'Blob Icon',
      icon: blob,
      onProgress: (step, state) => blobProgress.push([step, state]),
    })
    expect(blobProgress).toEqual([
      ['upload', 'start'],
      ['upload', 'done'],
      ['link', 'start'],
      ['link', 'done'],
      ['profile', 'start'],
      ['profile', 'done'],
    ])

    // 2. Without icon: upload is omitted
    const noIconProgress: [string, string][] = []
    await saveLink(xrpc, {
      url: 'https://example.com/no-icon',
      title: 'No Icon',
      onProgress: (step, state) => noIconProgress.push([step, state]),
    })
    expect(noIconProgress).toEqual([
      ['link', 'start'],
      ['link', 'done'],
      ['profile', 'start'],
      ['profile', 'done'],
    ])

    // 3. With BlobRef icon: upload is omitted
    const blobRefProgress: [string, string][] = []
    const existingBlobRef: BlobRef = {
      $type: 'blob',
      ref: { $link: 'bafkreiexistingcid' },
      mimeType: 'image/png',
      size: 100,
    }
    await saveLink(xrpc, {
      url: 'https://example.com/blobref-icon',
      title: 'BlobRef Icon',
      icon: existingBlobRef,
      onProgress: (step, state) => blobRefProgress.push([step, state]),
    })
    expect(blobRefProgress).toEqual([
      ['link', 'start'],
      ['link', 'done'],
      ['profile', 'start'],
      ['profile', 'done'],
    ])
  })

  it('throws PartialSaveError when updateProfileLinks fails after link putRecord, and retry reuses rkey without new TID', async () => {
    const { xrpc, state } = makeFakeXrpc()

    const originalPutRecord = xrpc.putRecord.bind(xrpc)
    let failProfile = true
    xrpc.putRecord = vi.fn().mockImplementation(async (collection, rkey, record, opts) => {
      if (collection === PROFILE_COLLECTION && failProfile) {
        throw new Error('Profile update failure')
      }
      return originalPutRecord(collection, rkey, record, opts)
    })

    let caughtError: PartialSaveError | undefined
    try {
      await saveLink(xrpc, {
        url: 'https://example.com',
        title: 'Example',
      })
      expect.unreachable('Expected PartialSaveError')
    } catch (error) {
      expect(error).toBeInstanceOf(PartialSaveError)
      caughtError = error as PartialSaveError
    }

    expect(caughtError).toBeDefined()
    expect(caughtError!.rkey).toBeDefined()
    expect(caughtError!.ref).toBeDefined()
    expect(caughtError!.ref.uri).toBe(`at://${xrpc.did}/${LINK_COLLECTION}/${caughtError!.rkey}`)
    expect(caughtError!.cause).toBeInstanceOf(Error)
    expect((caughtError!.cause as Error).message).toBe('Profile update failure')

    // Link record exists in state
    expect(state.links.has(caughtError!.rkey)).toBe(true)
    expect(state.links.size).toBe(1)

    // Retry with caughtError.rkey
    failProfile = false
    const retriedRef = await saveLink(xrpc, {
      rkey: caughtError!.rkey,
      url: 'https://example.com',
      title: 'Example',
    })

    expect(retriedRef.uri).toBe(`at://${xrpc.did}/${LINK_COLLECTION}/${caughtError!.rkey}`)
    expect(state.links.size).toBe(1)
    expect(state.links.has(caughtError!.rkey)).toBe(true)
    expect(state.profile?.value.links).toEqual([
      { uri: retriedRef.uri, cid: retriedRef.cid },
    ])
  })
})

describe('profile-links: deleteLink and reorderLinks', () => {
  it('deleteLink removes from profile first, then deletes record', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const rkey = 'linkToDelete'
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`

    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri, cid: 'cidLink' }],
      },
    }
    state.links.set(rkey, {
      cid: 'cidLink',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })

    await deleteLink(xrpc, uri)

    expect(state.profile.value.links).toBeUndefined()
    expect('links' in state.profile.value).toBe(false)
    expect(state.links.has(rkey)).toBe(false)

    // Call order: getRecord/putRecord for profile, THEN deleteRecord for link
    const putProfileIndex = calls.findLastIndex(
      c => c.method === 'putRecord' && c.args[0] === PROFILE_COLLECTION,
    )
    const deleteLinkIndex = calls.findIndex(
      c => c.method === 'deleteRecord' && c.args[0] === LINK_COLLECTION,
    )
    expect(putProfileIndex).toBeGreaterThanOrEqual(0)
    expect(deleteLinkIndex).toBeGreaterThan(putProfileIndex)
  })

  it('deleteLink rejects malformed or wrong-repo AT-URIs', async () => {
    const { xrpc } = makeFakeXrpc('did:plc:alice')
    await expect(deleteLink(xrpc, 'at://did:plc:bob/app.bsky.actor.link/123')).rejects.toThrow(
      'Invalid link record URI',
    )
    await expect(deleteLink(xrpc, 'https://example.com')).rejects.toThrow('Invalid link record URI')
    await expect(deleteLink(xrpc, `at://${xrpc.did}/${LINK_COLLECTION}/`)).rejects.toThrow(
      'Invalid link record URI',
    )
  })

  it('deleteLink with cid sends swapRecord', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const rkey = 'link1'
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri, cid: 'cid1' }],
      },
    }
    state.links.set(rkey, {
      cid: 'cid1',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })

    await deleteLink(xrpc, uri, 'cid1')

    const deleteCall = calls.find(
      c => c.method === 'deleteRecord' && c.args[0] === LINK_COLLECTION && c.args[1] === rkey,
    )
    expect(deleteCall).toBeDefined()
    expect(deleteCall?.args[2]).toEqual({ swapRecord: 'cid1' })
  })

  it('deleteLink without cid sends no swapRecord', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')
    const rkey = 'link1'
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri, cid: 'cid1' }],
      },
    }
    state.links.set(rkey, {
      cid: 'cid1',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })

    await deleteLink(xrpc, uri)

    const deleteCall = calls.find(
      c => c.method === 'deleteRecord' && c.args[0] === LINK_COLLECTION && c.args[1] === rkey,
    )
    expect(deleteCall).toBeDefined()
    expect(deleteCall?.args[2]).toBeUndefined()
  })

  it('deleteLink maps InvalidSwap to ConcurrentEditError', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const rkey = 'link1'
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri, cid: 'cid1' }],
      },
    }
    state.links.set(rkey, {
      cid: 'cid1',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com', createdAt: '2024-01-01' },
    })

    xrpc.deleteRecord = vi.fn().mockRejectedValue(new XrpcError(400, 'InvalidSwap', 'Swap mismatch'))

    await expect(deleteLink(xrpc, uri, 'outdatedCid')).rejects.toThrow(ConcurrentEditError)
  })

  it('deleteLink treats RecordNotFound as success', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const rkey = 'link1'
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/${rkey}`
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri, cid: 'cid1' }],
      },
    }

    xrpc.deleteRecord = vi.fn().mockRejectedValue(new XrpcError(404, 'RecordNotFound', 'Record not found'))

    await expect(deleteLink(xrpc, uri, 'cid1')).resolves.toBeUndefined()
    expect(state.profile?.value.links).toBeUndefined()
  })

  it('reorderLinks updates profile link order', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const uri1 = `at://${xrpc.did}/${LINK_COLLECTION}/1`
    const uri2 = `at://${xrpc.did}/${LINK_COLLECTION}/2`
    const uri3 = `at://${xrpc.did}/${LINK_COLLECTION}/3`

    state.profile = {
      cid: 'profCid',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [
          { uri: uri1, cid: 'c1' },
          { uri: uri2, cid: 'c2' },
          { uri: uri3, cid: 'c3' },
        ],
      },
    }

    const reordered = await reorderLinks(xrpc, uri1, 2)
    expect(reordered.map(r => r.uri)).toEqual([uri2, uri3, uri1])
    expect(state.profile?.value.links?.map(r => r.uri)).toEqual([uri2, uri3, uri1])
  })
})

describe('profile-links: restoreLink', () => {
  it('throws when the record is missing', async () => {
    const { xrpc } = makeFakeXrpc('did:plc:alice')
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/nonexistent`
    await expect(restoreLink(xrpc, uri)).rejects.toThrow('missing')
  })

  it('rejects invalid URL (http, shortener, non-string url) with InvalidLinkError and no writes', async () => {
    const { xrpc, state, calls } = makeFakeXrpc('did:plc:alice')

    // 1. http URL
    state.links.set('httpLink', {
      cid: 'cidHttp',
      value: { $type: 'app.bsky.actor.link', url: 'http://insecure.example.com', createdAt: '2024-01-01' },
    })
    const httpUri = `at://${xrpc.did}/${LINK_COLLECTION}/httpLink`
    const callsBeforeHttp = calls.length
    try {
      await restoreLink(xrpc, httpUri)
      expect.unreachable('Should have thrown InvalidLinkError for http URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues).toContain('insecure')
    }
    expect(calls.slice(callsBeforeHttp).some(c => c.method === 'putRecord' || c.method === 'deleteRecord')).toBe(false)

    // 2. shortener URL
    state.links.set('shortLink', {
      cid: 'cidShort',
      value: { $type: 'app.bsky.actor.link', url: 'https://bit.ly/xyz', createdAt: '2024-01-01' },
    })
    const shortUri = `at://${xrpc.did}/${LINK_COLLECTION}/shortLink`
    const callsBeforeShort = calls.length
    try {
      await restoreLink(xrpc, shortUri)
      expect.unreachable('Should have thrown InvalidLinkError for shortener URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues).toContain('shortener')
    }
    expect(calls.slice(callsBeforeShort).some(c => c.method === 'putRecord' || c.method === 'deleteRecord')).toBe(false)

    // 3. non-string URL
    state.links.set('nonStringLink', {
      cid: 'cidNonString',
      value: { $type: 'app.bsky.actor.link', url: 12345 as unknown as string, createdAt: '2024-01-01' },
    })
    const nonStringUri = `at://${xrpc.did}/${LINK_COLLECTION}/nonStringLink`
    const callsBeforeNonString = calls.length
    try {
      await restoreLink(xrpc, nonStringUri)
      expect.unreachable('Should have thrown InvalidLinkError for non-string URL')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLinkError)
      expect((error as InvalidLinkError).issues.length).toBeGreaterThan(0)
    }
    expect(calls.slice(callsBeforeNonString).some(c => c.method === 'putRecord' || c.method === 'deleteRecord')).toBe(false)
  })

  it('is idempotent when uri is already in profile (replaces cid, no duplicate)', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/link1`

    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [
          { uri: `at://${xrpc.did}/${LINK_COLLECTION}/other`, cid: 'cidOther' },
          { uri, cid: 'oldCid' },
        ],
      },
    }

    state.links.set('link1', {
      cid: 'newCid',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com/1', createdAt: '2024-01-01' },
    })

    const links = await restoreLink(xrpc, uri)
    expect(links).toHaveLength(2)
    expect(links.filter(r => r.uri === uri)).toHaveLength(1)
    expect(links.find(r => r.uri === uri)?.cid).toBe('newCid')
    expect(state.profile?.value.links).toEqual([
      { uri: `at://${xrpc.did}/${LINK_COLLECTION}/other`, cid: 'cidOther' },
      { uri, cid: 'newCid' },
    ])
  })

  it('inserts when absent', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/link1`

    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: [{ uri: `at://${xrpc.did}/${LINK_COLLECTION}/other`, cid: 'cidOther' }],
      },
    }

    state.links.set('link1', {
      cid: 'cid1',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com/1', createdAt: '2024-01-01' },
    })

    const links = await restoreLink(xrpc, uri)
    expect(links).toHaveLength(2)
    expect(links[1]).toEqual({ uri, cid: 'cid1' })
    expect(state.profile?.value.links).toEqual([
      { uri: `at://${xrpc.did}/${LINK_COLLECTION}/other`, cid: 'cidOther' },
      { uri, cid: 'cid1' },
    ])
  })

  it('throws TooManyLinksError when profile already has 10 links and record is absent', async () => {
    const { xrpc, state } = makeFakeXrpc('did:plc:alice')
    const tenLinks: StrongRef[] = Array.from({ length: 10 }, (_, i) => ({
      uri: `at://${xrpc.did}/${LINK_COLLECTION}/link${i}`,
      cid: `cid${i}`,
    }))
    state.profile = {
      cid: 'prof1',
      value: {
        $type: 'app.bsky.actor.profile',
        links: tenLinks,
      },
    }

    state.links.set('link11', {
      cid: 'cid11',
      value: { $type: 'app.bsky.actor.link', url: 'https://example.com/11', createdAt: '2024-01-01' },
    })
    const uri = `at://${xrpc.did}/${LINK_COLLECTION}/link11`

    await expect(restoreLink(xrpc, uri)).rejects.toThrow(TooManyLinksError)
    expect(state.profile?.value.links).toHaveLength(10)
  })
})

describe('profile-links: generateTid', () => {
  it('generates 13-character base32 strings that are monotonically increasing', () => {
    const tids: string[] = []
    for (let i = 0; i < 50; i++) {
      tids.push(generateTid())
    }

    for (const tid of tids) {
      expect(tid).toHaveLength(13)
      expect(/^[234567abcdefghijklmnopqrstuvwxyz]{13}$/.test(tid)).toBe(true)
    }

    for (let i = 1; i < tids.length; i++) {
      expect(tids[i]! > tids[i - 1]!).toBe(true)
    }
  })
})
