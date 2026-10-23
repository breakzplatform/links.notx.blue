# links.notx.blue

Custom icons for Bluesky profile links. Sign in with Bluesky, pick any icon for each link, and the link still points straight at its destination: there is no redirector, no account on this site and no analytics.

**Use it at <https://links.notx.blue>.**

Made by [@joseli.to](https://bsky.app/profile/joseli.to).

## Using it

Sign in with Bluesky, or with an account on another AT Protocol server (handle or server address), and the page lists the links on your profile. For each one you can:

- **Edit** the address, the title and the icon.
- **Reorder** it, **remove** it from the profile, or **add** a new link (up to 10).
- Bring back or delete records that exist in your repo but are not on the profile.

The icon can come from a file, an image URL, the site's own favicon, or a preset (a letter or an emoji on a coloured circle). The editor crops it square, shows how it will look in Bluesky's profile row, and saves it.

The interface is in English and Brazilian Portuguese. It follows your browser's language, and the button at the top switches it. The theme button cycles light, dark and terminal.

## How it works

Bluesky launched profile links on 2026-10-22. Each link is an `app.bsky.actor.link` record in the user's repo, with an icon (a blob) that the official app fills with the site's favicon. Any client can write that record with a different blob, and the AppView serves the blob as is. This site does exactly that.

1. **Sign-in** is OAuth with `@atproto/oauth-client-browser` (public client, DPoP, PKCE). Tokens stay in the browser's IndexedDB. The client metadata is served at `/client-metadata.json` by a Netlify function that builds it from the requesting origin, so deploy previews can sign in too.
2. **The scope** is `atproto repo:app.bsky.actor.link repo:app.bsky.actor.profile?action=create&action=update blob?accept=image/png&accept=image/jpeg&accept=image/webp`. It is narrower than the `app.bsky.authManageProfile` permission set, which also grants status and notification declaration writes. Reads use public endpoints, so no `rpc:` scope is needed.
3. **Saving** is `uploadBlob`, then `putRecord` for the link (a TID rkey when new), then `putRecord` for the profile with `swapRecord` (CID). Only the profile's `links` field changes; everything else round-trips byte for byte. If another client edits the profile in between, the operation is redone on the new record, up to 3 attempts.
4. **Validation** matches Bluesky (`social-app` and the AppView): https only, no shorteners (the file and link hosts Bluesky blocked before 2026-10-23 are in that list now; there is no hostname blocklist), title up to 40 graphemes / 320 bytes, icon PNG/JPEG/WebP up to 100,000 bytes, at most 10 links. All of it reads the address as typed and never follows redirects. Bluesky's own app also asks its Safelink service about new links; this site does not.
5. **Icons** are cropped and encoded in a `<canvas>` at 256 px, dropping to 192 or 128 px when needed to fit the limit.
6. **The image proxy** at `/api/image-proxy` is the only server code: a Netlify Function (`netlify/functions/image-proxy.ts`) around the shared handler in `server/proxy.ts`. It fetches the image URLs and favicons that browsers cannot read cross-origin. It is stateless and keeps no logs; it allows https only, with SSRF guards (no IP literals, private ranges, odd ports or credentials), a 2 MB cap and image types only (checked against magic bytes). It only answers same-origin requests, and Netlify rate-limits it to 120 requests per 60 s per client IP (`config.rateLimit`), high enough for many users behind one mobile carrier IP.

## Running it locally

```sh
npm install
npm run dev        # http://127.0.0.1:5173
```

Use `127.0.0.1`, not `localhost`: the loopback OAuth client's redirect points there. The image proxy is a Netlify Function, so the image URL and favicon sources need `npx netlify-cli dev` to work locally.

```sh
npm test           # typecheck, unit tests, and a check that the compiled CSS is current
npm run build      # production build into dist/
```

## Project layout

```
.
├── index.html, 404.html   # Vite entry points, with the page metadata
├── src/
│   ├── main.ts             # boots the shell, then the app
│   ├── oauth.ts            # OAuth client, sign-in and session restore
│   ├── i18n.ts             # English and Brazilian Portuguese strings
│   ├── styles.css          # the site's own components, on design system tokens
│   ├── assets/             # compiled Tailwind CSS, version in the file name
│   ├── lib/                # link rules, profile records, XRPC, image crop and encode
│   └── ui/                 # views: shell, landing, links, editor, faq
├── server/proxy.ts         # image proxy handler and its guards
├── netlify/functions/      # the proxy as a Netlify Function, with its route and rate limit
├── public/                 # copied as is: client metadata, og.png, icons, manifest
├── test/                   # Vitest unit tests
├── netlify.toml            # build, functions, security headers and CSP
└── scripts/                # tooling only, never deployed
    ├── build-css.sh        # rebuilds src/assets/tailwind-*.css (--check verifies it)
    ├── build-social.sh     # renders og.html to public/og.png
    ├── build-icons.sh      # renders avatar.svg to the touch, PWA and OAuth logo icons
    ├── og.html, avatar.svg
    ├── tailwind-input.css, tailwind-theme.css
    └── ds/                 # copy of the joseli.to design system tokens
```

Fonts are not in the repository. They load from `static.joseli.to`.

### Changing styles

The CSS is Tailwind v4 on the joseli.to design system, compiled ahead of time into `src/assets/tailwind-4.3.3.css` and committed. After changing Tailwind classes in the HTML or in `src/`, rebuild it:

```sh
npm run build:css
```

`npm test` fails if the committed file is stale. The default Tailwind palette, radii and shadows are disabled on purpose, so use the design system names (`bg-surface-page`, `text-text-2` and so on). There are no shadow utilities: the hard shadow is a halftone dot field, added with the design system classes `cast` (bordered block with the dot shadow), `press` (buttons: lift on hover, flat on press) and `lift` (cards). Components specific to this site live in `src/styles.css`, which Vite bundles after the compiled file.

### Themes

There are three themes: light (the default), dark and terminal (amber on black). The choice is manual only: the page never reads `prefers-color-scheme`. The theme button stores the choice in `localStorage` under `theme`, and `public/theme-boot.js`, loaded first in `<head>`, applies it before the first paint. Every colour token has a value for each theme in `scripts/ds/tokens/`, copied verbatim from the joseli.to design system; replace the directory to update it, never edit it here.

### Changing the preview image or icons

Edit `scripts/og.html` or `scripts/avatar.svg`, then run `./scripts/build-social.sh` or `./scripts/build-icons.sh`. Both need Chrome installed. `public/icon-192.png` is the logo named in `client-metadata.json`, so the icons script writes it too. The favicon is `public/favicon.svg`, edited by hand.

### Deploying

The Netlify site `links-notx-blue` builds from `netlify.toml`. Pushes to `main` deploy automatically. `dist/404.html` is the not-found page and `/privacy` redirects (301) to the shared policy at <https://notx.blue/privacy>. To deploy by hand:

```sh
NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... npm run deploy
```

DNS: `links` is a DNS-only CNAME to `links-notx-blue.netlify.app` on the `notx.blue` zone; Netlify issues the certificate.

## Contact

Abuse: abuse@notx.blue. Privacy policy: <https://notx.blue/privacy>.
