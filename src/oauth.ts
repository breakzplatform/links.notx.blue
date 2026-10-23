import {
  BrowserOAuthClient,
  OAuthResponseError,
  type OAuthSession,
} from '@atproto/oauth-client-browser'
import { CLIENT_ID, HANDLE_RESOLVER, SCOPE } from './lib/config'
import { createXrpc } from './lib/xrpc'
import type { Did, Xrpc } from './lib/types'

type DeletedHandler = () => void

function loopbackPage(): boolean {
  return location.hostname === '127.0.0.1' || location.hostname === 'localhost'
}

function devRedirectUri(): string {
  const url = new URL(location.origin)
  // Loopback client metadata is registered for 127.0.0.1. Keep the port the dev server actually used.
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1'
  return url.href
}

function clientIdFor(): string {
  if (!loopbackPage()) return CLIENT_ID
  // The loopback client id is the client metadata. The callback has to be
  // exchanged with the same id, including the scope sent to PAR.
  return `http://localhost?redirect_uri=${encodeURIComponent(devRedirectUri())}&scope=${encodeURIComponent(SCOPE)}`
}

export function normalizeSignInInput(input: string): string {
  let value = input.trim()
  let previous = ''
  while (value !== previous) {
    previous = value
    if (value.toLowerCase().startsWith('at://')) value = value.slice('at://'.length).trim()
    else if (value.startsWith('@')) value = value.slice(1).trim()
  }
  return value
}

export function isInvalidScope(error: unknown): boolean {
  if (error instanceof OAuthResponseError) return error.error === 'invalid_scope'
  return error instanceof Error && error.message.includes('invalid_scope')
}

export function isCancelledSignIn(error: unknown): boolean {
  if (error instanceof Error && error.message === 'User navigated back') return true
  if (typeof AggregateError !== 'undefined' && error instanceof AggregateError) {
    return error.errors.some(item => isCancelledSignIn(item))
  }
  return false
}

export type Auth = {
  init(): Promise<OAuthSession | undefined>
  signIn(input: string): Promise<void>
  signOut(session: OAuthSession): Promise<void>
  xrpcFor(session: OAuthSession): Promise<Xrpc>
  onDeleted(handler: DeletedHandler): void
}

export async function createAuth(): Promise<Auth> {
  const deleted = new Set<DeletedHandler>()
  const client = await BrowserOAuthClient.load({
    clientId: clientIdFor(),
    handleResolver: HANDLE_RESOLVER,
    onSessionDeleted() {
      for (const handler of deleted) handler()
    },
  })
  const xrpcCache = new WeakMap<OAuthSession, Promise<Xrpc>>()

  return {
    init() {
      return client.init().then(result => result?.session)
    },
    onDeleted(handler) {
      deleted.add(handler)
    },
    signIn(input) {
      return client.signIn(normalizeSignInInput(input), { scope: SCOPE }).then(() => undefined)
    },
    signOut(session) {
      return session.signOut()
    },
    xrpcFor(session) {
      const cached = xrpcCache.get(session)
      if (cached) return cached
      const created = sessionToXrpc(session)
      xrpcCache.set(session, created)
      return created
    },
  }
}

async function sessionToXrpc(session: OAuthSession): Promise<Xrpc> {
  const info = await session.getTokenInfo()
  // `aud` is the resource server (the PDS). A non-HTTP audience is not a PDS, and the issuer is not a fallback.
  const pdsUrl = httpOrigin(info.aud)
  if (!pdsUrl) throw new Error('Session audience is not a PDS URL')
  return createXrpc(session.fetchHandler.bind(session), asDid(session.did), pdsUrl)
}

function httpOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

function asDid(value: string): Did {
  if (!value.startsWith('did:')) throw new Error('OAuth subject is not a DID')
  return value as Did
}
