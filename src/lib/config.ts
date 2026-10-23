export const SITE_ORIGIN = 'https://links.notx.blue'
export const CLIENT_ID = `${SITE_ORIGIN}/client-metadata.json`
export const REDIRECT_URI = `${SITE_ORIGIN}/`
export const DEV_REDIRECT_URI = 'http://127.0.0.1:5173/'
export const HANDLE_RESOLVER = 'https://bsky.social'
export const PUBLIC_APPVIEW = 'https://public.api.bsky.app'
export const ABUSE_CONTACT = 'abuse@joseli.to'

// Narrower than include:app.bsky.authManageProfile, which also grants
// app.bsky.actor.status and app.bsky.notification.declaration writes.
// Reads go to public endpoints, so no rpc: scope is needed.
export const SCOPE =
  'atproto repo:app.bsky.actor.link repo:app.bsky.actor.profile blob:image/*'
export const FALLBACK_SCOPE = 'atproto transition:generic'

export const LINK_COLLECTION = 'app.bsky.actor.link'
export const PROFILE_COLLECTION = 'app.bsky.actor.profile'
