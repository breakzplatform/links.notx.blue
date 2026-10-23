// Source: social-app/src/features/profileLinks/providers.ts and lib/strings/url-helpers.ts (2026-10-23).
// SHORTENER_DOMAINS includes the union with atproto/packages/bsky/src/views/profile-link-rules.ts.
// There is no hostname blocklist: social-app moved its blocked hosts into the shortener list on 2026-10-23.
export type SupportProviderLogoName =
  | 'BackerKit'
  | 'BigCartel'
  | 'Boosty'
  | 'Booth'
  | 'BuyMeACoffee'
  | 'CashApp'
  | 'Chuffed'
  | 'Crowdfundr'
  | 'Donorbox'
  | 'Etsy'
  | 'Fourthwall'
  | 'Givebutter'
  | 'GiveSendGo'
  | 'GoFundMe'
  | 'Gumroad'
  | 'Indiegogo'
  | 'Inprint'
  | 'ItchIo'
  | 'JustGiving'
  | 'Kickstarter'
  | 'KoFi'
  | 'Liberapay'
  | 'OpenCollective'
  | 'Patreon'
  | 'PayPal'
  | 'PixivFanbox'
  | 'Redbubble'
  | 'Skeb'
  | 'Stripe'
  | 'Substack'
  | 'Throne'
  | 'Venmo'
  | 'Vgen'
  | 'Zeffy'

export type SupportProvider = {
  name: string
  logo: SupportProviderLogoName
  domain: string
  pathPrefix?: string
}

export const SUPPORT_PROVIDERS: SupportProvider[] = [
  {name: 'BackerKit', logo: 'BackerKit', domain: 'backerkit.com'},
  {name: 'Big Cartel', logo: 'BigCartel', domain: 'bigcartel.com'},
  {name: 'Boosty', logo: 'Boosty', domain: 'boosty.to'},
  {name: 'BOOTH', logo: 'Booth', domain: 'booth.pm'},
  {name: 'Buy Me a Coffee', logo: 'BuyMeACoffee', domain: 'buymeacoffee.com'},
  {name: 'Cash App', logo: 'CashApp', domain: 'cash.app'},
  {
    name: 'Chuffed',
    logo: 'Chuffed',
    domain: 'chuffed.org',
    pathPrefix: '/campaign/',
  },
  {
    name: 'Chuffed',
    logo: 'Chuffed',
    domain: 'chuffed.org',
    pathPrefix: '/project/',
  },
  {name: 'Crowdfundr', logo: 'Crowdfundr', domain: 'crowdfundr.com'},
  {name: 'Donorbox', logo: 'Donorbox', domain: 'donorbox.org'},
  {name: 'Etsy', logo: 'Etsy', domain: 'etsy.com'},
  {name: 'Fourthwall', logo: 'Fourthwall', domain: 'fourthwall.com'},
  {name: 'Givebutter', logo: 'Givebutter', domain: 'givebutter.com'},
  {name: 'GiveSendGo', logo: 'GiveSendGo', domain: 'givesendgo.com'},
  {name: 'GoFundMe', logo: 'GoFundMe', domain: 'gofundme.com'},
  {name: 'Gumroad', logo: 'Gumroad', domain: 'gumroad.com'},
  {name: 'Indiegogo', logo: 'Indiegogo', domain: 'indiegogo.com'},
  {
    name: 'INPRNT',
    logo: 'Inprint',
    domain: 'inprnt.com',
    pathPrefix: '/gallery/',
  },
  {name: 'itch.io', logo: 'ItchIo', domain: 'itch.io'},
  {name: 'JustGiving', logo: 'JustGiving', domain: 'justgiving.com'},
  {name: 'Kickstarter', logo: 'Kickstarter', domain: 'kickstarter.com'},
  {name: 'Ko-fi', logo: 'KoFi', domain: 'ko-fi.com'},
  {name: 'Liberapay', logo: 'Liberapay', domain: 'liberapay.com'},
  {
    name: 'Open Collective',
    logo: 'OpenCollective',
    domain: 'opencollective.com',
  },
  {name: 'Patreon', logo: 'Patreon', domain: 'patreon.com'},
  {
    name: 'PayPal',
    logo: 'PayPal',
    domain: 'paypal.com',
    pathPrefix: '/paypalme/',
  },
  {name: 'PayPal', logo: 'PayPal', domain: 'paypal.me'},
  {name: 'pixivFANBOX', logo: 'PixivFanbox', domain: 'fanbox.cc'},
  {name: 'Redbubble', logo: 'Redbubble', domain: 'redbubble.com'},
  {name: 'Skeb', logo: 'Skeb', domain: 'skeb.jp'},
  {name: 'Stripe', logo: 'Stripe', domain: 'buy.stripe.com'},
  {name: 'Stripe', logo: 'Stripe', domain: 'donate.stripe.com'},
  {name: 'Substack', logo: 'Substack', domain: 'substack.com'},
  {name: 'Throne', logo: 'Throne', domain: 'throne.com'},
  {name: 'Venmo', logo: 'Venmo', domain: 'venmo.com'},
  {name: 'VGen', logo: 'Vgen', domain: 'vgen.co'},
  {name: 'Zeffy', logo: 'Zeffy', domain: 'zeffy.com'},
]

export function normalizeProfileLinkUrl(input: string): string | null {
  return definitelyUrl(input.trim())
}

const SOCIAL_APP_SHORTENER_DOMAINS = [
  'aceimg.in',
  'acel.me',
  'adf.ly',
  'bit.ly',
  'bitly.com',
  'bl.ink',
  'buff.ly',
  'clck.ru',
  'cutt.ly',
  'fc-lc.xyz',
  'goo.gl',
  'goto.now',
  'is.gd',
  'link2.fm',
  'ln.run',
  'lnk.ua',
  'lnkd.in',
  'n9.cl',
  'onlylinks.cc',
  'ow.ly',
  'psee.io',
  'rb.gy',
  'rebrand.ly',
  'rg.by',
  's.id',
  'short.do',
  'short.gy',
  'shorten.as',
  'shorten.ee',
  'shorten.is',
  'shorten.so',
  'shorten.tv',
  'shorten.world',
  'shorter.me',
  'shortn.icu',
  'shorturl.at',
  'shorturl.lt',
  'shorturl.ly',
  'slicedrve.in',
  'slnt.to',
  'smarturl.lt',
  'smarturl.my',
  'sprl.me',
  'sw.run',
  't.co',
  't.ly',
  'tiny.cc',
  'tinyurl.com',
  'urlr.me',
  'v.gd',
  'vdey.in',
  'videy.at',
  'videy.lt',
  'videy.my',
  'x.gd',
  'zig.ht',
]

const APPVIEW_SHORTENER_DOMAINS = [
  'adf.ly',
  'bit.ly',
  'bitly.com',
  'bl.ink',
  'buff.ly',
  'clck.ru',
  'cutt.ly',
  'goo.gl',
  'is.gd',
  'lnkd.in',
  'ow.ly',
  'rb.gy',
  'rebrand.ly',
  's.id',
  'short.gy',
  'shorturl.at',
  't.co',
  't.ly',
  'tiny.cc',
  'tinyurl.com',
  'v.gd',
  'x.gd',
]

export const SHORTENER_DOMAINS = [...new Set([...SOCIAL_APP_SHORTENER_DOMAINS, ...APPVIEW_SHORTENER_DOMAINS])]

function parseWebUrl(url: string): URL | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed
    }
  } catch {}
  return undefined
}

export function hostMatchesDomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`)
}

function isAccountUrl(parsed: URL, provider: SupportProvider) {
  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase().replace(/\/+$/, '')
  if (provider.pathPrefix) {
    const prefix = provider.pathPrefix.replace(/\/+$/, '')
    return path.startsWith(`${prefix}/`)
  }
  const isAccountSubdomain =
    host !== provider.domain && host !== `www.${provider.domain}`
  return isAccountSubdomain || path.length > 0
}

export function getSupportProvider(url: string): SupportProvider | undefined {
  const parsed = parseWebUrl(url)
  if (!parsed) return undefined
  const host = parsed.hostname.toLowerCase()
  return SUPPORT_PROVIDERS.find(
    provider =>
      hostMatchesDomain(host, provider.domain) &&
      isAccountUrl(parsed, provider),
  )
}

export function isInsecureLink(url: string): boolean {
  return parseWebUrl(url)?.protocol === 'http:'
}

export function isShortenerLink(url: string): boolean {
  const parsed = parseWebUrl(url)
  if (!parsed) return false
  const host = parsed.hostname.toLowerCase()
  return SHORTENER_DOMAINS.some(domain => hostMatchesDomain(host, domain))
}

export function formatLinkUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

export function getLinkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}


function definitelyUrl(maybeUrl: string) {
  try {
    if (maybeUrl.endsWith('.')) return null

      if (!maybeUrl.startsWith('https://') && !maybeUrl.startsWith('http://')) {
      maybeUrl = 'https://' + maybeUrl
    }

    const url = new URL(maybeUrl)

      const hostname = url.hostname
    const labels = hostname.split('.')

      if (labels.length < 2) return null

    const tld = labels[labels.length - 1]

      if (!/^[a-z]{2,}$/i.test(tld ?? '')) return null

    return url.toString()
  } catch {
    return null
  }
}

export const MAX_PROFILE_LINKS = 10
export const TITLE_MAX_GRAPHEMES = 40
export const TITLE_MAX_BYTES = 320
export const ICON_MAX_BYTES = 100_000
export const ICON_MIME = ['image/png', 'image/jpeg', 'image/webp']
export type LinkIssue = 'empty' | 'invalid' | 'insecure' | 'shortener' | 'too-many'

export function validateLink(input: string, opts: { existingCount: number; editing: boolean }): {
  url: string | null; issues: LinkIssue[]; provider?: SupportProvider
} {
  const trimmed = input.trim()
  const url = normalizeProfileLinkUrl(trimmed)
  const issues: LinkIssue[] = []
  if (!trimmed) issues.push('empty')
  else if (!url) issues.push('invalid')
  if (/^http:/i.test(trimmed) || (url && isInsecureLink(url))) issues.push('insecure')
  if (url && isShortenerLink(url)) issues.push('shortener')
  if (!opts.editing && opts.existingCount >= MAX_PROFILE_LINKS) issues.push('too-many')
  return { url: issues.length ? null : url, issues, ...(!issues.length && url ? { provider: getSupportProvider(url) } : {}) }
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
export function graphemeLength(value: string): number {
  return Array.from(segmenter.segment(value)).length
}
export function validateTitle(title: string): { value?: string; issues: ('too-long-graphemes' | 'too-long-bytes')[] } {
  const value = title.trim() || undefined
  const issues: ('too-long-graphemes' | 'too-long-bytes')[] = []
  if (value && graphemeLength(value) > TITLE_MAX_GRAPHEMES) issues.push('too-long-graphemes')
  if (value && new TextEncoder().encode(value).length > TITLE_MAX_BYTES) issues.push('too-long-bytes')
  return { value, issues }
}
export function validateIcon(blob: { type: string; size: number }): ('bad-type' | 'too-big')[] {
  const issues: ('bad-type' | 'too-big')[] = []
  if (!ICON_MIME.includes(blob.type)) issues.push('bad-type')
  if (blob.size > ICON_MAX_BYTES) issues.push('too-big')
  return issues
}
