import type { LinkIssue } from './lib/rules'

export type Locale = 'pt-BR' | 'en'

type Copy = Record<Locale, string>

const STORAGE_KEY = 'links.locale'

const messages = {
  appTitle: { 'pt-BR': 'Ícones próprios nos links do Bluesky • links.notx.blue', en: 'Custom icons for Bluesky profile links • links.notx.blue' },
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
  leadStrong: { 'pt-BR': 'Escolha o ícone de cada link do seu perfil no Bluesky.', en: 'Pick the icon for each link on your Bluesky profile.' },
  leadRest: { 'pt-BR': 'O link continua apontando direto para o destino.', en: 'The link still points straight at its destination.' },
  promoLabel: { 'pt-BR': 'Você sabia?', en: 'Did you know?' },
  promoLead: { 'pt-BR': 'Quer baixar um vídeo do Bluesky? Use o', en: 'Want to save a Bluesky video? Try' },
  handleHint: { 'pt-BR': 'voce.exemplo.com ou https://pds.exemplo.com', en: 'you.example.com or https://pds.example.com' },
  handleLabel: { 'pt-BR': 'Seu handle ou servidor', en: 'Your handle or server' },
  panelLinks: { 'pt-BR': 'Seus links', en: 'Your links' },
  panelIcon: { 'pt-BR': 'Ícone', en: 'Icon' },
  panelPreview: { 'pt-BR': 'Prévia e salvar', en: 'Preview and save' },
  previewLight: { 'pt-BR': 'Claro', en: 'Light' },
  previewDark: { 'pt-BR': 'Escuro', en: 'Dark' },
  previewNote: {
    'pt-BR': 'Simulação do perfil no app do Bluesky: o ícone aparece pequeno, à esquerda do título.',
    en: 'A mock of the profile in the Bluesky app: the icon shows small, to the left of the title.',
  },
  previewZoom: { 'pt-BR': 'Ícone ampliado 4×', en: 'Icon zoomed 4×' },
  exampleLeft: { 'pt-BR': 'Loja', en: 'Shop' },
  exampleRight: { 'pt-BR': 'Blog', en: 'Blog' },
  previewSample: { 'pt-BR': 'Seu link', en: 'Your link' },
  footerStatus: { 'pt-BR': 'Em construção. Espere bugs', en: 'Work in progress. Expect bugs' },
  foundBug: { 'pt-BR': 'achou um?', en: 'found one?' },
  partOf: { 'pt-BR': 'parte do', en: 'part of' },
  byAuthor: { 'pt-BR': 'por', en: 'by' },
  viewSource: { 'pt-BR': 'ver código', en: 'view-source' },
  fromBrazil: {
    'pt-BR': 'Direto do Brasil pelo Joselito, com muito carinho. Este site não usa cookies nem guarda dados seus. Não tem relação com o Bluesky.',
    en: 'Directly from Brazil by Joselito, with much love and care. This site does not use cookies or store any of your data. It is not related to Bluesky.',
  },
  support: { 'pt-BR': 'Apoie este projeto:', en: 'Support this project:' },
  supportCard: { 'pt-BR': 'Cartão (Mercado Pago)', en: 'Card (Mercado Pago)' },
  faqTitle: { 'pt-BR': 'Perguntas frequentes', en: 'FAQ' },
  faqWhereQ: { 'pt-BR': 'Onde o ícone aparece?', en: 'Where does the icon show up?' },
  faqWhereA: {
    'pt-BR': 'Na pílula do link, logo abaixo da bio do seu perfil no app do Bluesky, à esquerda do título. A prévia do editor imita essa pílula nos temas claro e escuro. Sem ícone, o app mostra um globo.',
    en: 'On the link pill just under the bio of your profile in the Bluesky app, to the left of the title. The editor preview mimics that pill in light and dark. With no icon, the app shows a globe.',
  },
  faqClientsQ: { 'pt-BR': 'Funciona em outros clientes?', en: 'Does it work on other clients?' },
  faqClientsA: {
    'pt-BR': 'O ícone fica salvo no seu repositório, então qualquer cliente pode lê-lo, mas cada um decide se o mostra. Só o app oficial do Bluesky foi usado como referência aqui; nos outros, não dá para garantir.',
    en: 'The icon is saved in your repo, so any client can read it, but each one decides whether to show it. Only the official Bluesky app was used as the reference here; for others there is no guarantee.',
  },
  faqRemoveQ: { 'pt-BR': 'Dá para remover o ícone?', en: 'Can I remove the icon?' },
  faqRemoveA: {
    'pt-BR': 'Dá. Edite o link e escolha “Sem ícone”, ou use “Remover” na lista para tirar o link do perfil e apagar o registro.',
    en: 'Yes. Edit the link and choose “No icon”, or use “Remove” in the list to take the link off the profile and delete the record.',
  },
  faqRejectedQ: { 'pt-BR': 'Por que não consigo adicionar alguns sites?', en: 'Why can’t I add some sites?' },
  faqRejectedA: {
    'pt-BR': 'As regras são do Bluesky, e este site só repete as que dá para checar antes de salvar. Não entram: endereços http (só https) e encurtadores de URL (bit.ly, t.co, tinyurl.com e outros, além de alguns hospedeiros de arquivos e links, como videy.at). Para um encurtador, use o endereço final. O app do Bluesky também confere links novos numa lista de moderação (Safelink) que este site não enxerga. Todas essas checagens leem só o endereço digitado e nunca seguem redirecionamentos: um endereço no seu próprio domínio, ou numa página de links sua, que redirecione para um site barrado é aceito. É como funciona hoje, não uma garantia: o Bluesky pode incluir o seu domínio nas regras ou remover o link.',
    en: 'The rules are Bluesky’s, and this site only repeats the ones it can check before you save. Not accepted: http addresses (https only) and URL shorteners (bit.ly, t.co, tinyurl.com and others, plus a few file and link hosts such as videy.at). For a shortener, use the final address. Bluesky’s own app also checks new links against a moderation list (Safelink) that this site cannot see. Every one of these checks reads only the address you type and never follows redirects, so an address on your own domain, or on a link page of yours, that redirects to a blocked site is accepted. That is how it works today, not a promise: Bluesky can add your domain to its rules or remove the link.',
  },
  faqGreenQ: { 'pt-BR': 'Por que alguns links ficam verdes?', en: 'Why are some links green?' },
  faqGreenA: {
    'pt-BR': 'O Bluesky pinta o link de verde, com o logo da plataforma, quando o endereço é de um site da lista de apoio: Patreon, Ko-fi, Buy Me a Coffee, GoFundMe, Open Collective, Liberapay, Substack, itch.io, Etsy, Kickstarter, PayPal.me e outros. Quem decide é só o endereço: uma página na plataforma (não só a página inicial), e em alguns casos, como PayPal e INPRNT, o caminho. Nesses links o app mostra o logo da plataforma e ignora o seu ícone, e um ícone personalizado também não deixa verde um link que não está na lista. Plataformas adultas não entram na lista.',
    en: 'Bluesky paints a link green, with the platform’s logo, when its address is on the list of support sites: Patreon, Ko-fi, Buy Me a Coffee, GoFundMe, Open Collective, Liberapay, Substack, itch.io, Etsy, Kickstarter, PayPal.me and others. Only the address decides: a page on the platform (not just its homepage) and, for a few such as PayPal and INPRNT, the path. For those links the app shows the platform’s logo and ignores your icon, and a custom icon cannot turn a link that is not on the list green. Adult platforms are not on the list.',
  },
  faqPasswordQ: { 'pt-BR': 'Minha senha fica guardada?', en: 'Is my password stored?' },
  faqPasswordA: {
    'pt-BR': 'Não. O login é OAuth: você digita a senha no próprio Bluesky, nunca aqui. O site pede só permissão para gravar links, o perfil e imagens, e a sessão fica neste navegador. Não há conta nem banco de dados.',
    en: 'No. Sign-in is OAuth: you type your password on Bluesky itself, never here. The site only asks to write links, the profile and images, and the session stays in this browser. There is no account and no database.',
  },
  faqImageQ: { 'pt-BR': 'Quais imagens servem?', en: 'Which images work?' },
  faqImageA: {
    'pt-BR': 'Você pode enviar PNG, JPEG, WebP, GIF, AVIF ou ícone (.ico), até 10 MB; SVG não entra. O site recorta em quadrado e reduz para 256, 192 ou 128 px até caber em 100 kB, e salva em PNG, WebP ou JPEG.',
    en: 'You can upload PNG, JPEG, WebP, GIF, AVIF or an icon (.ico), up to 10 MB; SVG is not accepted. The site crops it square and scales it to 256, 192 or 128 px until it fits in 100 kB, and saves it as PNG, WebP or JPEG.',
  },
  signInTitle: { 'pt-BR': 'Entrar', en: 'Sign in' },
  signInAtmosphere: { 'pt-BR': 'Funciona com o Bluesky e com qualquer servidor do AT Protocol (Atmosphere).', en: 'Works with Bluesky and any AT Protocol (Atmosphere) server.' },
  signInWithBluesky: { 'pt-BR': 'Entrar com o Bluesky', en: 'Sign in with Bluesky' },
  signInOther: { 'pt-BR': 'Entrar com outra conta da Atmosphere', en: 'Sign in with another Atmosphere account' },
  signInContinue: { 'pt-BR': 'Continuar', en: 'Continue' },
  signInExplain: {
    'pt-BR': 'Buscamos o servidor (PDS) do seu handle e levamos você até ele para entrar. Sua senha nunca passa por este site.',
    en: 'We look up the server (PDS) behind your handle and send you there to sign in. Your password never touches this site.',
  },
  handleRequired: { 'pt-BR': 'Informe o handle.', en: 'Enter your handle.' },
  signingIn: { 'pt-BR': 'Abrindo o Bluesky…', en: 'Opening Bluesky…' },
  signInCancelled: { 'pt-BR': 'A entrada foi cancelada.', en: 'Sign-in was cancelled.' },
  sessionEnded: { 'pt-BR': 'A sessão acabou. Entre de novo.', en: 'The session ended. Sign in again.' },
  signOut: { 'pt-BR': 'Sair', en: 'Sign out' },
  linksCount: { 'pt-BR': '{count} de {max}', en: '{count} of {max}' },
  linksEmpty: { 'pt-BR': 'Nenhum link no perfil ainda.', en: 'No profile links yet.' },
  addLink: { 'pt-BR': 'Adicionar link', en: 'Add link' },
  limitReached: { 'pt-BR': 'O perfil já tem 10 links, que é o máximo.', en: 'The profile already has 10 links, which is the maximum.' },
  hiddenHeading: { 'pt-BR': 'Registros fora do perfil', en: 'Records not on the profile' },
  hiddenLead: {
    'pt-BR': 'Estes links existem no seu repositório, mas não estão na lista do perfil. Dá para colocar de volta ou apagar.',
    en: 'These links exist in your repo, but they are not in the profile list. You can add one back or delete it.',
  },
  moveUp: { 'pt-BR': 'Mover {label} para cima', en: 'Move {label} up' },
  moveDown: { 'pt-BR': 'Mover {label} para baixo', en: 'Move {label} down' },
  edit: { 'pt-BR': 'Editar {label}', en: 'Edit {label}' },
  remove: { 'pt-BR': 'Remover {label}', en: 'Remove {label}' },
  addBack: { 'pt-BR': 'Colocar {label} no perfil', en: 'Add {label} to the profile' },
  deleteRecord: { 'pt-BR': 'Apagar {label}', en: 'Delete {label}' },
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
  back: { 'pt-BR': 'Voltar', en: 'Back' },
  backToLinks: { 'pt-BR': 'Voltar aos seus links', en: 'Back to your links' },
  urlLabel: { 'pt-BR': 'Endereço', en: 'Address' },
  titleLabel: { 'pt-BR': 'Título', en: 'Title' },
  titleHint: { 'pt-BR': 'Opcional. Se ficar vazio, o perfil mostra o domínio.', en: 'Optional. If you leave it empty, the profile shows the domain.' },
  titleCount: { 'pt-BR': '{count}/{max}', en: '{count}/{max}' },
  greenProvider: {
    'pt-BR': 'Este endereço corresponde a {name}, então o app mostra o botão verde com qualquer ícone que você salvar.',
    en: 'This address matches {name}, so the app shows the green button no matter which icon you save.',
  },
  iconTypeTitle: { 'pt-BR': 'Escolha o tipo', en: 'Select type' },
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
  presetTextHint: { 'pt-BR': 'Digite uma letra ou cole um emoji. Só o primeiro caractere entra no ícone.', en: 'Type a letter or paste an emoji. Only the first character is drawn.' },
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
  noIcon: {
    'pt-BR': 'Sem ícone personalizado, o app do Bluesky mostra um globo genérico ao lado do título. Ele não busca o favicon do site por conta própria.',
    en: 'With no custom icon, the Bluesky app shows a generic globe next to the title. It does not look up the site’s favicon on its own.',
  },
  currentIcon: { 'pt-BR': 'Ícone atual', en: 'Current icon' },
  encoding: { 'pt-BR': 'Preparando o ícone…', en: 'Preparing the icon…' },
  fileMeta: { 'pt-BR': '{size}×{size} {mime} · {bytes}', en: '{size}×{size} {mime} · {bytes}' },
  keptMeta: { 'pt-BR': 'Ícone atual · {mime} · {bytes}', en: 'Current icon · {mime} · {bytes}' },
  loadingImage: { 'pt-BR': 'Carregando a imagem…', en: 'Loading the image…' },
  chooseImage: { 'pt-BR': 'Escolha uma imagem, ou outra origem de ícone.', en: 'Choose an image, or another icon source.' },
  save: { 'pt-BR': 'Salvar', en: 'Save' },
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
  issueEmpty: { 'pt-BR': 'Informe o endereço do link.', en: 'Enter the link address.' },
  issueInvalid: { 'pt-BR': 'Esse endereço não é um URL válido. Use um domínio com um ponto, como exemplo.com.', en: 'That address is not a valid URL. Use a domain with a dot, such as example.com.' },
  issueInsecure: { 'pt-BR': 'O link precisa ser https. Endereços http não aparecem no perfil.', en: 'The link must be https. http addresses are hidden from the profile.' },
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
  apply(stored === 'en' || stored === 'pt-BR' ? stored : detectLocale())
}

// Same rule as down.blue: a stored choice wins, then Portuguese for any pt-*
// browser, English for everything else.
function detectLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
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
