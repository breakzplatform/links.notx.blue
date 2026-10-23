// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { initLocale, setLocale, t } from '../src/i18n'
import { createAuth, type Auth } from '../src/oauth'
import { loadLinks, reorderLinks, type LinkView } from '../src/lib/profile-links'
import type { Xrpc } from '../src/lib/types'
import { startApp, hasSessionHint } from '../src/ui/app'
import { createShell } from '../src/ui/shell'
import { renderLinksSkeleton } from '../src/ui/skeleton'

vi.mock('../src/oauth', async importOriginal => ({
  ...await importOriginal<typeof import('../src/oauth')>(),
  createAuth: vi.fn(),
}))
vi.mock('../src/lib/profile-links', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/profile-links')>(),
  loadLinks: vi.fn(),
  reorderLinks: vi.fn(),
}))
vi.mock('../src/ui/profile', () => ({ fetchProfile: vi.fn(async () => ({ handle: 'alice.test', displayName: 'Alice' })) }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const session = { did: 'did:plc:alice' } as unknown as OAuthSession
const link: LinkView = {
  rkey: 'first', uri: 'at://did:plc:alice/app.bsky.actor.link/first', cid: 'cid', stale: false,
  record: { $type: 'app.bsky.actor.link', url: 'https://example.com', title: 'Example', createdAt: '2026-01-01T00:00:00Z' },
}
const result = { shown: [link], hidden: [], profileCid: 'profile' }
let deleted: (sub?: string) => void
let auth: Auth

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  history.replaceState(null, '', '/')
  document.body.replaceChildren()
  initLocale()
  setLocale('en')
  auth = {
    init: vi.fn(async () => undefined),
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    xrpcFor: vi.fn(async () => ({} as Xrpc)),
    onDeleted: callback => { deleted = callback },
  }
  vi.mocked(createAuth).mockResolvedValue(auth)
  vi.mocked(loadLinks).mockResolvedValue(result)
})
afterEach(() => { vi.restoreAllMocks() })

function mount() {
  const root = document.createElement('div')
  document.body.append(root)
  const shell = createShell(root)
  return { root, shell, ready: startApp(shell) }
}

describe('initial loading', () => {
  it('renders an interactive landing before the auth client is ready and queues a sign-in', async () => {
    const client = deferred<Auth>()
    vi.mocked(createAuth).mockReturnValue(client.promise)
    const { shell, ready } = mount()
    const button = shell.main.querySelector<HTMLButtonElement>('#bsky-sign-in')!
    expect(button.disabled).toBe(false)
    button.click()
    expect(shell.main.querySelector('.signin-status')?.textContent).toBe(t('signingIn'))
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(localStorage.getItem('links.session')).toBeNull()
    client.resolve(auth)
    await ready
    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('https://bsky.social'))
  })

  it('keeps the existing landing and typed input when restore finds no session', async () => {
    const restore = deferred<OAuthSession | undefined>()
    vi.mocked(auth.init).mockReturnValue(restore.promise)
    const { shell, ready } = mount()
    const input = shell.main.querySelector<HTMLInputElement>('#handle')!
    input.value = 'alice.test'
    restore.resolve(undefined)
    await ready
    expect(shell.main.querySelector('#handle')).toBe(input)
    expect(input.value).toBe('alice.test')
  })

  it('shows three decorative skeleton rows and FAQ until the first list has loaded', async () => {
    localStorage.setItem('links.session', '1')
    vi.mocked(auth.init).mockResolvedValue(session)
    const links = deferred<Awaited<ReturnType<typeof loadLinks>>>()
    vi.mocked(loadLinks).mockReturnValue(links.promise)
    const { shell, ready } = mount()
    expect(shell.main.querySelectorAll('ol.links > li.link.ranked')).toHaveLength(3)
    expect(shell.main.querySelector('.db-panel[aria-busy="true"]')).not.toBeNull()
    expect(shell.main.querySelector('#faq-title')).not.toBeNull()
    expect(shell.main.querySelector('.db-callout-promo')).not.toBeNull()
    await vi.waitFor(() => expect(loadLinks).toHaveBeenCalledOnce())
    expect(shell.main.querySelector('.empty')).toBeNull()
    links.resolve(result)
    await ready
    expect(shell.main.querySelector('.skel')).toBeNull()
    expect(shell.main.textContent).toContain('Example')
    expect(localStorage.getItem('links.session')).toBe('1')
  })

  it('clears a stale hint when no session is restored', async () => {
    localStorage.setItem('links.session', '1')
    const { shell, ready } = mount()
    await ready
    expect(localStorage.getItem('links.session')).toBeNull()
    expect(shell.main.querySelector('#bsky-sign-in')).not.toBeNull()
  })

  it('reports auth startup failure inside the landing even with a queued sign-in', async () => {
    const client = deferred<Auth>()
    vi.mocked(createAuth).mockReturnValue(client.promise)
    const { shell, ready } = mount()
    shell.main.querySelector<HTMLButtonElement>('#bsky-sign-in')!.click()
    client.reject(new Error('Client unavailable'))
    await ready
    await vi.waitFor(() => expect(shell.main.querySelector('.signin-body .alert')?.textContent).toContain('Client unavailable'))
    expect(shell.main.querySelector<HTMLInputElement>('#handle')!.disabled).toBe(false)
  })

  it('allows a fresh sign-in after a failed session restore', async () => {
    vi.mocked(auth.init).mockRejectedValue(new Error('Restore failed'))
    const { shell, ready } = mount()
    await ready
    shell.main.querySelector<HTMLButtonElement>('#bsky-sign-in')!.click()
    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('https://bsky.social'))
  })

  it('does not restore a session deleted while its transport is loading', async () => {
    vi.mocked(auth.init).mockResolvedValue(session)
    const transport = deferred<Xrpc>()
    vi.mocked(auth.xrpcFor).mockReturnValue(transport.promise)
    const { shell, ready } = mount()
    await vi.waitFor(() => expect(auth.xrpcFor).toHaveBeenCalledOnce())
    deleted()
    transport.resolve({} as Xrpc)
    await ready
    expect(loadLinks).not.toHaveBeenCalled()
    expect(localStorage.getItem('links.session')).toBeNull()
    expect(shell.main.querySelector('#bsky-sign-in')).not.toBeNull()
  })

  it('keeps the new session when the client revokes a leftover one during the callback', async () => {
    history.replaceState(null, '', '/#state=abc&code=def&iss=https%3A%2F%2Fbsky.social')
    vi.mocked(auth.init).mockImplementation(async () => {
      deleted(session.did)
      return session
    })
    const { shell, ready } = mount()
    await ready
    expect(loadLinks).toHaveBeenCalledOnce()
    expect(shell.main.textContent).not.toContain(t('sessionEnded'))
    expect(shell.main.querySelector('#bsky-sign-in')).toBeNull()
    expect(localStorage.getItem('links.session')).toBe('1')
    expect(createAuth).toHaveBeenCalledOnce()
    expect(auth.init).toHaveBeenCalledOnce()
  })

  it('ignores the deletion of another account while signed in', async () => {
    vi.mocked(auth.init).mockResolvedValue(session)
    const { shell, ready } = mount()
    await ready
    deleted('did:plc:someone-else')
    expect(shell.main.querySelector('#bsky-sign-in')).toBeNull()
    expect(localStorage.getItem('links.session')).toBe('1')
  })

  it('shows the ended-session notice when the signed-in account is deleted', async () => {
    vi.mocked(auth.init).mockResolvedValue(session)
    const { shell, ready } = mount()
    await ready
    deleted(session.did)
    expect(shell.main.querySelector('.alert')?.textContent).toContain(t('sessionEnded'))
  })

  it.each(['?code=example', '?state=example', '?iss=example', '#code=example', '#state=example', '#iss=example'])('recognizes callback hint %s without storage', query => {
    history.replaceState(null, '', `/${query}`)
    expect(hasSessionHint()).toBe(true)
  })

  it('works when local storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(hasSessionHint()).toBe(false)
    history.replaceState(null, '', '/?code=example')
    expect(hasSessionHint()).toBe(true)
  })
})

describe('restored lists', () => {
  beforeEach(() => { vi.mocked(auth.init).mockResolvedValue(session) })

  it('keeps old rows disabled during reload after a move', async () => {
    const second = { ...link, rkey: 'second', uri: `${link.uri}2` }
    vi.mocked(loadLinks).mockResolvedValueOnce({ ...result, shown: [link, second] })
    const active = mount()
    await active.ready
    const links = deferred<Awaited<ReturnType<typeof loadLinks>>>()
    vi.mocked(loadLinks).mockReturnValue(links.promise)
    active.shell.main.querySelector<HTMLButtonElement>('#move-down-first')!.click()
    await vi.waitFor(() => expect(loadLinks).toHaveBeenCalledTimes(2))
    expect(active.shell.main.querySelector('.skel')).toBeNull()
    expect(active.shell.main.querySelectorAll('.link')).toHaveLength(2)
    expect(active.shell.main.querySelector<HTMLButtonElement>('#edit-first')!.disabled).toBe(true)
    expect(active.shell.main.querySelector('.db-panel-status')?.textContent).toBe(t('loadingLinks'))
    links.resolve(result)
    await vi.waitFor(() => expect(active.shell.main.querySelector<HTMLButtonElement>('#edit-first')!.disabled).toBe(false))
  })

  it('clears the session hint on session deletion', async () => {
    const { shell, ready } = mount()
    await ready
    deleted()
    expect(localStorage.getItem('links.session')).toBeNull()
    expect(shell.main.querySelector('#bsky-sign-in')).not.toBeNull()
  })

  it('clears the session hint on sign-out', async () => {
    const { shell, ready } = mount()
    await ready
    shell.main.querySelector<HTMLButtonElement>('.profile button')!.click()
    await vi.waitFor(() => expect(localStorage.getItem('links.session')).toBeNull())
    expect(shell.main.querySelector('#bsky-sign-in')).not.toBeNull()
  })
})

it('marks every skeleton block decorative', () => {
  const main = document.createElement('main')
  renderLinksSkeleton(main)
  expect([...main.querySelectorAll('.skel')].every(block => block.getAttribute('aria-hidden') === 'true')).toBe(true)
})
