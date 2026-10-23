import type { LinkIssue } from './lib/rules'

export type Locale = 'pt-BR' | 'en'

type Copy = Record<Locale, string>

const STORAGE_KEY = 'links.locale'

const messages = {
  appTitle: { 'pt-BR': 'Ícones de links', en: 'Link icons' },
  privacyDocumentTitle: { 'pt-BR': 'Privacidade — Ícones de links', en: 'Privacy — Link icons' },
  languageLabel: { 'pt-BR': 'Idioma', en: 'Language' },
  skip: { 'pt-BR': 'Ir para o conteúdo', en: 'Skip to content' },
  privacyLink: { 'pt-BR': 'Privacidade', en: 'Privacy' },
  themeLight: { 'pt-BR': 'claro', en: 'light' },
  themeDark: { 'pt-BR': 'escuro', en: 'dark' },
  themeTerminal: { 'pt-BR': 'terminal', en: 'terminal' },
  themeAria: { 'pt-BR': 'Tema: {current}, toque para {next}', en: 'Theme: {current}, tap for {next}' },
  restoring: { 'pt-BR': 'Restaurando a sessão…', en: 'Restoring the session…' },
  invalidScope: {
    'pt-BR': 'O servidor de login recusou o escopo pedido (invalid_scope). A entrada foi interrompida.',
    en: 'The sign-in server rejected the requested scope (invalid_scope). Sign-in stopped.',
  },
  landingTitle: { 'pt-BR': 'Ícones nos links do perfil', en: 'Icons on your profile links' },
  landingLead: {
    'pt-BR': 'Escolha qualquer ícone para os links do seu perfil no Bluesky. O link aponta direto para o destino, sem redirecionador no meio.',
    en: 'Choose any icon for the links on your Bluesky profile. The link points straight at the destination, with no redirector in between.',
  },
  handleLabel: { 'pt-BR': 'Handle', en: 'Handle' },
  handleHint: { 'pt-BR': 'nome.bsky.social ou seu domínio', en: 'name.bsky.social or your domain' },
  signIn: { 'pt-BR': 'Entrar', en: 'Sign in' },
  signInBsky: { 'pt-BR': 'Entrar com bsky.social', en: 'Sign in with bsky.social' },
  handleRequired: { 'pt-BR': 'Informe o handle ou use o botão do bsky.social.', en: 'Enter a handle, or use the bsky.social button.' },
  privacySummary: {
    'pt-BR': 'A sessão fica só neste navegador (IndexedDB). Este site não guarda conta, token nem ícone. O ícone que você salva vira um arquivo público no seu repositório Bluesky.',
    en: 'The session stays in this browser (IndexedDB). This site stores no account, token, or icon. An icon you save becomes a public file in your Bluesky repo.',
  },
  tryEditor: { 'pt-BR': 'Experimentar o editor de ícones', en: 'Try the icon editor' },
  signingIn: { 'pt-BR': 'Abrindo o Bluesky…', en: 'Opening Bluesky…' },
  signInCancelled: { 'pt-BR': 'A entrada foi cancelada.', en: 'Sign-in was cancelled.' },
  sessionEnded: { 'pt-BR': 'A sessão acabou. Entre de novo.', en: 'The session ended. Sign in again.' },
  signOut: { 'pt-BR': 'Sair', en: 'Sign out' },
  shownHeading: { 'pt-BR': 'Links no perfil', en: 'Links on your profile' },
  linksCount: { 'pt-BR': '{count} de {max}', en: '{count} of {max}' },
  linksEmpty: { 'pt-BR': 'Nenhum link no perfil ainda.', en: 'No profile links yet.' },
  addLink: { 'pt-BR': 'Adicionar link', en: 'Add link' },
  limitReached: { 'pt-BR': 'O perfil já tem 10 links, que é o máximo.', en: 'The profile already has 10 links, which is the maximum.' },
  hiddenHeading: { 'pt-BR': 'Registros fora do perfil', en: 'Records not on the profile' },
  hiddenLead: {
    'pt-BR': 'Estes links existem no seu repositório, mas não estão na lista do perfil. Dá para colocar de volta ou apagar.',
    en: 'These links exist in your repo, but they are not in the profile list. You can add one back or delete it.',
  },
  hiddenEmpty: { 'pt-BR': 'Nenhum registro oculto.', en: 'No hidden records.' },
  moveUp: { 'pt-BR': 'Mover {label} para cima', en: 'Move {label} up' },
  moveDown: { 'pt-BR': 'Mover {label} para baixo', en: 'Move {label} down' },
  edit: { 'pt-BR': 'Editar {label}', en: 'Edit {label}' },
  remove: { 'pt-BR': 'Remover {label}', en: 'Remove {label}' },
  addBack: { 'pt-BR': 'Colocar {label} no perfil', en: 'Add {label} to the profile' },
  deleteRecord: { 'pt-BR': 'Apagar {label}', en: 'Delete {label}' },
  up: { 'pt-BR': 'Subir', en: 'Up' },
  down: { 'pt-BR': 'Descer', en: 'Down' },
  editShort: { 'pt-BR': 'Editar', en: 'Edit' },
  removeShort: { 'pt-BR': 'Remover', en: 'Remove' },
  addBackShort: { 'pt-BR': 'Colocar no perfil', en: 'Add to profile' },
  deleteShort: { 'pt-BR': 'Apagar', en: 'Delete' },
  confirmRemove: {
    'pt-BR': 'Remover “{label}” do perfil e apagar o registro?',
    en: 'Remove “{label}” from the profile and delete the record?',
  },
  confirmDelete: { 'pt-BR': 'Apagar o registro “{label}”?', en: 'Delete the record “{label}”?' },
  confirmAction: { 'pt-BR': 'Confirmar', en: 'Confirm' },
  cancel: { 'pt-BR': 'Cancelar', en: 'Cancel' },
  stale: { 'pt-BR': 'O perfil ainda aponta para uma versão antiga deste registro.', en: 'The profile still points at an older version of this record.' },
  missing: { 'pt-BR': 'O perfil aponta para um registro que não existe mais.', en: 'The profile points at a record that is gone.' },
  missingLabel: { 'pt-BR': 'Registro ausente', en: 'Missing record' },
  loadingLinks: { 'pt-BR': 'Carregando os links…', en: 'Loading links…' },
  saved: { 'pt-BR': 'Link salvo.', en: 'Link saved.' },
  removed: { 'pt-BR': 'Link removido.', en: 'Link removed.' },
  deleted: { 'pt-BR': 'Registro apagado.', en: 'Record deleted.' },
  reordered: { 'pt-BR': 'Ordem atualizada.', en: 'Order updated.' },
  addedBack: { 'pt-BR': 'Link colocado no perfil.', en: 'Link added to the profile.' },
  working: { 'pt-BR': 'Salvando…', en: 'Saving…' },
  editorNew: { 'pt-BR': 'Novo link', en: 'New link' },
  editorEdit: { 'pt-BR': 'Editar link', en: 'Edit link' },
  editorDemo: { 'pt-BR': 'Editor de ícones', en: 'Icon editor' },
  demoNote: {
    'pt-BR': 'Modo de demonstração. Dá para montar o ícone, mas salvar fica desativado.',
    en: 'Demo mode. You can build the icon, but saving is disabled.',
  },
  back: { 'pt-BR': 'Voltar', en: 'Back' },
  urlLabel: { 'pt-BR': 'Endereço', en: 'Address' },
  titleLabel: { 'pt-BR': 'Título', en: 'Title' },
  titleHint: { 'pt-BR': 'Opcional. Se ficar vazio, o perfil mostra o domínio.', en: 'Optional. If you leave it empty, the profile shows the domain.' },
  titleCount: { 'pt-BR': '{count}/{max}', en: '{count}/{max}' },
  greenNote: {
    'pt-BR': 'O Bluesky escolhe o botão verde pelo endereço, não pelo ícone. Um ícone personalizado não deixa o link verde.',
    en: 'Bluesky picks the green button from the address, not from the icon. A custom icon cannot turn a link green.',
  },
  greenProvider: {
    'pt-BR': 'Este endereço corresponde a {name}, então o app mostra o botão verde com qualquer ícone que você salvar.',
    en: 'This address matches {name}, so the app shows the green button no matter which icon you save.',
  },
  iconSources: { 'pt-BR': 'Origem do ícone', en: 'Icon source' },
  sourceUpload: { 'pt-BR': 'Arquivo', en: 'Upload' },
  sourceUrl: { 'pt-BR': 'URL da imagem', en: 'Image URL' },
  sourceFavicon: { 'pt-BR': 'Favicon do site', en: 'Site favicon' },
  sourcePreset: { 'pt-BR': 'Letra ou emoji', en: 'Letter or emoji' },
  sourceKeep: { 'pt-BR': 'Manter o atual', en: 'Keep current' },
  sourceNone: { 'pt-BR': 'Sem ícone', en: 'No icon' },
  fileLabel: { 'pt-BR': 'Arquivo de imagem', en: 'Image file' },
  fileHint: { 'pt-BR': 'PNG, JPEG, WebP ou outro formato de imagem, até 10 MB. Também dá para soltar o arquivo aqui.', en: 'PNG, JPEG, WebP, or another image, up to 10 MB. You can also drop a file here.' },
  imageLoaded: { 'pt-BR': 'Imagem carregada.', en: 'Image loaded.' },
  imageUrlLabel: { 'pt-BR': 'URL da imagem', en: 'Image URL' },
  loadImage: { 'pt-BR': 'Carregar imagem', en: 'Load image' },
  faviconHint: {
    'pt-BR': 'Busca o favicon do endereço do link, via cardyb.bsky.app.',
    en: 'Fetches the favicon for the link address, via cardyb.bsky.app.',
  },
  faviconNeedUrl: { 'pt-BR': 'Informe um endereço https válido para buscar o favicon.', en: 'Enter a valid https address to fetch the favicon.' },
  loadFavicon: { 'pt-BR': 'Buscar favicon', en: 'Fetch favicon' },
  presetTextLabel: { 'pt-BR': 'Letra ou emoji', en: 'Letter or emoji' },
  presetTextHint: { 'pt-BR': 'Só o primeiro caractere entra no ícone.', en: 'Only the first character is drawn.' },
  kindLetter: { 'pt-BR': 'Letra', en: 'Letter' },
  kindEmoji: { 'pt-BR': 'Emoji', en: 'Emoji' },
  colorLegend: { 'pt-BR': 'Cor de fundo', en: 'Background' },
  colorCustom: { 'pt-BR': 'Outra cor', en: 'Other color' },
  colorPix: { 'pt-BR': 'Verde Pix #32BCAD', en: 'Pix green #32BCAD' },
  colorBlue: { 'pt-BR': 'Azul #1185FE', en: 'Blue #1185FE' },
  colorBlack: { 'pt-BR': 'Preto #000000', en: 'Black #000000' },
  colorPurple: { 'pt-BR': 'Roxo #9333EA', en: 'Purple #9333EA' },
  colorRed: { 'pt-BR': 'Vermelho #DC2626', en: 'Red #DC2626' },
  colorOrange: { 'pt-BR': 'Laranja #EA580C', en: 'Orange #EA580C' },
  colorGold: { 'pt-BR': 'Dourado #CA8A04', en: 'Gold #CA8A04' },
  colorGreen: { 'pt-BR': 'Verde #15803D', en: 'Green #15803D' },
  colorPink: { 'pt-BR': 'Rosa #DB2777', en: 'Pink #DB2777' },
  zoom: { 'pt-BR': 'Zoom', en: 'Zoom' },
  cropLabel: { 'pt-BR': 'Recorte quadrado', en: 'Square crop' },
  cropHelp: {
    'pt-BR': 'Arraste para mover. Com o recorte em foco, as setas do teclado também movem. Shift aumenta o passo.',
    en: 'Drag to pan. When the crop is focused, the arrow keys pan too. Shift uses a larger step.',
  },
  previewLabel: { 'pt-BR': 'Prévia', en: 'Preview' },
  previewZoom: { 'pt-BR': 'Ampliado 4×', en: 'Zoomed 4×' },
  thisLink: { 'pt-BR': 'Este', en: 'This one' },
  exampleLeft: { 'pt-BR': 'Loja', en: 'Shop' },
  exampleRight: { 'pt-BR': 'Blog', en: 'Blog' },
  noIcon: { 'pt-BR': 'Sem ícone.', en: 'No icon.' },
  currentIcon: { 'pt-BR': 'Ícone atual', en: 'Current icon' },
  encoding: { 'pt-BR': 'Preparando o ícone…', en: 'Preparing the icon…' },
  fileMeta: { 'pt-BR': '{size}×{size} {mime} · {bytes}', en: '{size}×{size} {mime} · {bytes}' },
  keptMeta: { 'pt-BR': 'Ícone atual · {mime} · {bytes}', en: 'Current icon · {mime} · {bytes}' },
  loadingImage: { 'pt-BR': 'Carregando a imagem…', en: 'Loading the image…' },
  chooseImage: { 'pt-BR': 'Escolha uma imagem, ou outra origem de ícone.', en: 'Choose an image, or another icon source.' },
  save: { 'pt-BR': 'Salvar', en: 'Save' },
  saveDemo: { 'pt-BR': 'Salvar está desativado na demonstração', en: 'Save is disabled in the demo' },
  saving: { 'pt-BR': 'Salvando o ícone, o link e o perfil…', en: 'Saving the icon, the link, and the profile…' },
  stepUpload: { 'pt-BR': 'Enviar ícone', en: 'Upload icon' },
  stepLink: { 'pt-BR': 'Salvar link', en: 'Save link' },
  stepProfile: { 'pt-BR': 'Atualizar perfil', en: 'Update profile' },
  stepPending: { 'pt-BR': 'Na fila', en: 'Waiting' },
  stepActive: { 'pt-BR': 'Agora', en: 'Now' },
  stepDone: { 'pt-BR': 'Feito', en: 'Done' },
  stepSkipped: { 'pt-BR': 'Não precisa', en: 'Not needed' },
  stepError: { 'pt-BR': 'Falhou', en: 'Failed' },
  stepsLabel: { 'pt-BR': 'Progresso', en: 'Progress' },
  partialSave: {
    'pt-BR': 'O link foi salvo, mas ainda não entrou no perfil. Salve de novo para tentar colocar.',
    en: 'The link was saved, but it is not on the profile yet. Save again to add it.',
  },
  fixInEditor: { 'pt-BR': 'Abrir no editor', en: 'Open in the editor' },
  restoreMissing: {
    'pt-BR': 'Esse registro de link não existe mais.',
    en: 'That link record is gone.',
  },
  concurrent: {
    'pt-BR': 'O perfil mudou em outro lugar. A lista foi recarregada. Tente de novo.',
    en: 'The profile changed elsewhere. The list was reloaded. Try again.',
  },
  tooMany: { 'pt-BR': 'O perfil já tem 10 links.', en: 'The profile already has 10 links.' },
  iconTooBig: { 'pt-BR': 'O ícone não coube em 100 kB.', en: 'The icon could not be made to fit in 100 kB.' },
  imageError: { 'pt-BR': 'Não foi possível ler essa imagem.', en: 'Could not read that image.' },
  notImage: {
    'pt-BR': 'Esse arquivo não é um tipo aceito (PNG, JPEG, WebP, GIF, AVIF ou ícone). SVG não entra.',
    en: 'That file is not an allowed type (PNG, JPEG, WebP, GIF, AVIF, or icon). SVG is not accepted.',
  },
  imageTooBig: { 'pt-BR': 'A imagem passa de 10 MB.', en: 'The image is over 10 MB.' },
  imageHttps: { 'pt-BR': 'A URL da imagem precisa ser https.', en: 'The image URL must be https.' },
  genericError: { 'pt-BR': 'Algo deu errado.', en: 'Something went wrong.' },
  privacyH1: { 'pt-BR': 'Privacidade', en: 'Privacy' },
  privacyIntro: {
    'pt-BR': 'Este site coloca ícones nos links do seu perfil no Bluesky. O link continua apontando para o endereço que você informar.',
    en: 'This site sets icons on your Bluesky profile links. The link still points at the address you enter.',
  },
  privacyBrowserTitle: { 'pt-BR': 'Tudo no navegador', en: 'Everything runs in the browser' },
  privacyBrowser: {
    'pt-BR': 'A página, o recorte e a codificação do ícone rodam neste navegador. Não há uma conta neste site.',
    en: 'The page, the crop, and the icon encoding run in this browser. There is no account on this site.',
  },
  privacyTokensTitle: { 'pt-BR': 'Tokens neste navegador', en: 'Tokens stay in this browser' },
  privacyTokens: {
    'pt-BR': 'O login usa OAuth. Os tokens ficam no IndexedDB deste navegador, guardados pela biblioteca OAuth. Outro navegador não recebe essa sessão.',
    en: 'Sign-in uses OAuth. Tokens stay in this browser’s IndexedDB, managed by the OAuth library. Another browser does not receive that session.',
  },
  privacyStoreTitle: { 'pt-BR': 'Não guardamos nada', en: 'We store nothing' },
  privacyStore: {
    'pt-BR': 'Não há banco de dados nosso. Não guardamos handle, token, perfil nem ícone.',
    en: 'There is no database of ours. We do not store your handle, token, profile, or icon.',
  },
  privacyProxyTitle: { 'pt-BR': 'O único código no servidor', en: 'The only server code' },
  privacyProxy: {
    'pt-BR': 'Um proxy de imagem, sem estado, busca uma imagem quando o navegador não consegue baixá-la direto. Ele não escreve log e não armazena a imagem.',
    en: 'A stateless image proxy fetches an image when the browser cannot download it directly. It keeps no logs and does not store the image.',
  },
  privacyPublicTitle: { 'pt-BR': 'Ícones públicos', en: 'Public icons' },
  privacyPublic: {
    'pt-BR': 'O ícone que você salva vira um blob público no seu repositório Bluesky. Quem vê o seu perfil pode ver esse ícone.',
    en: 'An icon you save becomes a public blob in your Bluesky repo. Anyone who can see your profile can see that icon.',
  },
  privacyContactTitle: { 'pt-BR': 'Contato', en: 'Contact' },
  privacyContact: { 'pt-BR': 'Abuso e outras mensagens: {email}', en: 'Abuse and other messages: {email}' },
  issueEmpty: { 'pt-BR': 'Informe o endereço do link.', en: 'Enter the link address.' },
  issueInvalid: { 'pt-BR': 'Esse endereço não é um URL válido. Use um domínio com um ponto, como exemplo.com.', en: 'That address is not a valid URL. Use a domain with a dot, such as example.com.' },
  issueInsecure: { 'pt-BR': 'O link precisa ser https. Endereços http não aparecem no perfil.', en: 'The link must be https. http addresses are hidden from the profile.' },
  issueBlocked: { 'pt-BR': 'Esse domínio está bloqueado e não aparece no perfil.', en: 'That domain is blocked and will not show on the profile.' },
  issueShortener: { 'pt-BR': 'Encurtadores de URL não são aceitos. Use o endereço direto do destino.', en: 'URL shorteners are not allowed. Use the destination address itself.' },
  issueTooMany: { 'pt-BR': 'O perfil já tem 10 links, que é o máximo.', en: 'The profile already has 10 links, which is the maximum.' },
  titleGraphemes: { 'pt-BR': 'O título pode ter no máximo 40 caracteres.', en: 'The title can be at most 40 characters.' },
  titleBytes: { 'pt-BR': 'O título passa de 320 bytes.', en: 'The title is over 320 bytes.' },
  iconBadType: { 'pt-BR': 'O ícone precisa ser PNG, JPEG ou WebP.', en: 'The icon must be PNG, JPEG, or WebP.' },
  iconTooBigIssue: { 'pt-BR': 'O ícone precisa ter no máximo 100 kB.', en: 'The icon must be 100 kB or smaller.' },
} satisfies Record<string, Copy>

export type MessageKey = keyof typeof messages

let locale: Locale = 'pt-BR'
const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return locale
}

export function initLocale(): void {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  apply(stored === 'en' ? 'en' : 'pt-BR')
}

export function setLocale(next: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // The choice still applies for this page load.
  }
  apply(next)
  for (const listener of listeners) listener()
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const SLOT = /\{(\w+)\}/g

// One pass, and the replacer's return value is inserted literally.
// `$&` in a title and `{x}` inside a substituted value stay as text.
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text: string = messages[key][locale]
  if (!vars) return text
  return text.replace(SLOT, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) return match
    return String(vars[name])
  })
}

const linkIssueCopy: Record<LinkIssue, MessageKey> = {
  empty: 'issueEmpty',
  invalid: 'issueInvalid',
  insecure: 'issueInsecure',
  blocked: 'issueBlocked',
  shortener: 'issueShortener',
  'too-many': 'issueTooMany',
}

export function linkIssueMessage(issue: LinkIssue): string {
  return t(linkIssueCopy[issue])
}

export function titleIssueMessage(issue: 'too-long-graphemes' | 'too-long-bytes'): string {
  return t(issue === 'too-long-graphemes' ? 'titleGraphemes' : 'titleBytes')
}

export function iconIssueMessage(issue: 'bad-type' | 'too-big'): string {
  return t(issue === 'bad-type' ? 'iconBadType' : 'iconTooBigIssue')
}

function apply(next: Locale): void {
  locale = next
  document.documentElement.lang = next
}
