import { SCOPE } from '../src/lib/config'

// The client id is the URL this document is served from, so the metadata is
// built per origin: production and every deploy preview can sign in.
export function clientMetadata(origin: string): Record<string, unknown> {
  return {
    client_id: `${origin}/client-metadata.json`,
    client_name: 'Ícones de links / Link icons',
    client_uri: `${origin}/`,
    logo_uri: `${origin}/icon-192.png`,
    policy_uri: 'https://notx.blue/privacy',
    redirect_uris: [`${origin}/`],
    scope: SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }
}

export function metadataResponse(request: Request): Response {
  return new Response(JSON.stringify(clientMetadata(new URL(request.url).origin), null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300',
    },
  })
}
