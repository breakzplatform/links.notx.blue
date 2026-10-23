import { PUBLIC_APPVIEW } from '../lib/config'

export type PublicProfile = {
  handle: string
  displayName?: string
  avatar?: string
}

export async function fetchProfile(did: string): Promise<PublicProfile | null> {
  const url = new URL('/xrpc/app.bsky.actor.getProfile', PUBLIC_APPVIEW)
  url.searchParams.set('actor', did)
  const response = await fetch(url)
  if (!response.ok) return null
  const body = await response.json() as { handle?: unknown; displayName?: unknown; avatar?: unknown }
  if (typeof body.handle !== 'string' || body.handle.length === 0) return null
  return {
    handle: body.handle,
    displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    avatar: typeof body.avatar === 'string' ? body.avatar : undefined,
  }
}
