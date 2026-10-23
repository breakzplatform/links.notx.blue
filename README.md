# links.notx.blue

Ícones personalizados para os links de perfil do Bluesky, sem backend.

O Bluesky lançou links de perfil em 22/10/2026. Cada link é um registro
`app.bsky.actor.link` no repositório da pessoa, com um ícone (blob) que o app
oficial preenche com o favicon do site. Qualquer cliente pode gravar esse
registro com outro blob, e o AppView serve o blob como está. Este site faz
isso: você entra com o Bluesky (OAuth no navegador), escolhe o ícone que quiser
e o link continua apontando direto para o destino real. Sem redirecionador.

## Como funciona

- Site estático (Vite + TypeScript, sem framework) servido por um Cloudflare
  Worker com static assets em `https://links.notx.blue`.
- OAuth com `@atproto/oauth-client-browser` (cliente público, DPoP, PKCE). Os
  tokens ficam no IndexedDB do navegador. O client metadata está em
  `/client-metadata.json`.
- Escopo pedido: `atproto repo:app.bsky.actor.link repo:app.bsky.actor.profile blob:image/*`.
  É mais estreito que o permission set `app.bsky.authManageProfile` (que também
  libera status e declaração de notificações). As leituras usam endpoints
  públicos, sem escopo `rpc:`.
- Salvar: `uploadBlob` → `putRecord` do link (rkey TID se for novo) → `putRecord`
  do perfil com `swapRecord` (CID). Só o campo `links` do perfil muda; o resto
  volta byte a byte. Se outro cliente editar o perfil no meio, a operação é
  refeita sobre o registro novo (até 3 tentativas).
- Validação igual à do Bluesky (`social-app` e AppView): só https, sem
  encurtadores, sem domínios bloqueados, título até 40 grafemas / 320 bytes,
  ícone PNG/JPEG/WebP até 100 000 bytes, no máximo 10 links.
- Fontes de ícone: arquivo, URL de imagem, favicon do site (cardyb) ou preset
  (letra/emoji num círculo colorido). Recorte quadrado e codificação no
  `<canvas>` (256 px, caindo para 192/128 se precisar caber no limite).
- O único código de servidor é `/api/image-proxy`: um proxy de imagem sem
  estado, só https, com proteção contra SSRF, limite de 2 MB, só tipos de
  imagem, sem log e sem armazenamento. Só aceita chamadas do próprio site.

## Desenvolvimento

```sh
npm install
npm run dev        # http://127.0.0.1:5173 (cliente OAuth loopback)
npm test           # vitest
npm run typecheck
npm run build
```

Use `127.0.0.1`, não `localhost`: o redirect do cliente loopback aponta para ele.

## Deploy

```sh
CLOUDFLARE_API_TOKEN=... npm run deploy
```

Worker `links-notx-blue`, domínio próprio `links.notx.blue` (zona `notx.blue`,
plano Free). Sem KV, D1 ou R2.

## Contato

Abuso: abuse@joseli.to. Política de privacidade em `/privacy`.
