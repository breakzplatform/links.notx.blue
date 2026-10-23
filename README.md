# links.notx.blue

Custom icons for Bluesky profile links, with no backend of its own.

Bluesky launched profile links on 2026-10-22. Each link is an
`app.bsky.actor.link` record in the user's repo, with an icon (a blob) that
the official app fills with the site's favicon. Any client can write that
record with a different blob, and the AppView serves the blob as is. This site
does exactly that: you sign in with Bluesky (OAuth in the browser), pick any
icon, and the link still points straight at the real destination. No
redirector.

## How it works

- Static site (Vite + TypeScript, no framework) hosted on Netlify at
  `https://links.notx.blue`, styled with the joseli.to design system
  (`src/ds/`, Computer Modern served from `static.joseli.to`).
- OAuth with `@atproto/oauth-client-browser` (public client, DPoP, PKCE).
  Tokens stay in the browser's IndexedDB. The client metadata lives at
  `/client-metadata.json`.
- Requested scope: `atproto repo:app.bsky.actor.link
  repo:app.bsky.actor.profile?action=create&action=update
  blob?accept=image/png&accept=image/jpeg&accept=image/webp`. It is narrower
  than the `app.bsky.authManageProfile` permission set (which also grants
  status and notification declaration writes). Reads use public endpoints, so
  no `rpc:` scope is needed.
- Saving: `uploadBlob` → `putRecord` for the link (TID rkey when new) →
  `putRecord` for the profile with `swapRecord` (CID). Only the profile's
  `links` field changes; everything else round-trips byte for byte. If another
  client edits the profile in between, the operation is redone on the new
  record (up to 3 attempts).
- Validation matches Bluesky (`social-app` and the AppView): https only, no
  shorteners, no blocked domains, title up to 40 graphemes / 320 bytes, icon
  PNG/JPEG/WebP up to 100,000 bytes, at most 10 links.
- Icon sources: file, image URL, the site's favicon (cardyb) or a preset
  (letter/emoji on a coloured circle). Square crop and encoding happen in a
  `<canvas>` (256 px, dropping to 192/128 when needed to fit the limit).
- The only server code is `/api/image-proxy`, a Netlify Function
  (`netlify/functions/image-proxy.ts`) around the shared handler in
  `server/proxy.ts`: a stateless image proxy, https only, with SSRF guards
  (no IP literals, private ranges, odd ports or credentials), a 2 MB cap,
  image types only (checked against magic bytes), no logging and no storage.
  It only answers same-origin requests, and Netlify rate-limits it to 30
  requests per 60 s per client IP (`config.rateLimit`).

## Development

```sh
npm install
npm run dev        # http://127.0.0.1:5173 (loopback OAuth client)
npm test           # vitest
npm run typecheck
npm run build
```

Use `127.0.0.1`, not `localhost`: the loopback client's redirect points there.

## Deploy

Netlify site `links-notx-blue`, configured in `netlify.toml` (build command,
publish directory, functions, security headers and CSP). `dist/404.html` is
the not-found page and `dist/privacy.html` is served at `/privacy`.

Pushes to `main` deploy automatically. To deploy by hand:

```sh
NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... npm run deploy
```

DNS: `links` is a DNS-only (unproxied) CNAME to `links-notx-blue.netlify.app`
on the `notx.blue` zone; Netlify issues the Let's Encrypt certificate.

## Contact

Abuse: abuse@joseli.to. Privacy policy at `/privacy`.
