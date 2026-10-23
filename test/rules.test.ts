import { describe, expect, it } from 'vitest'
import {
  BLOCKED_DOMAINS,
  formatLinkUrl,
  getLinkHost,
  getSupportProvider,
  graphemeLength,
  hostMatchesDomain,
  ICON_MAX_BYTES,
  ICON_MIME,
  isBlockedProfileLink,
  isInsecureLink,
  isShortenerLink,
  MAX_PROFILE_LINKS,
  normalizeProfileLinkUrl,
  SHORTENER_DOMAINS,
  SUPPORT_PROVIDERS,
  TITLE_MAX_BYTES,
  TITLE_MAX_GRAPHEMES,
  validateIcon,
  validateLink,
  validateTitle,
} from '../src/lib/rules'

describe('rules: normalizeProfileLinkUrl (definitelyUrl)', () => {
  it('adds https scheme when missing', () => {
    expect(normalizeProfileLinkUrl('example.com')).toBe('https://example.com/')
    expect(normalizeProfileLinkUrl('sub.example.com/path')).toBe('https://sub.example.com/path')
  })

  it('preserves existing https and http schemes', () => {
    expect(normalizeProfileLinkUrl('https://example.com')).toBe('https://example.com/')
    expect(normalizeProfileLinkUrl('http://example.com/abc')).toBe('http://example.com/abc')
  })

  it('rejects urls ending with a dot', () => {
    expect(normalizeProfileLinkUrl('example.com.')).toBeNull()
    expect(normalizeProfileLinkUrl('https://example.com.')).toBeNull()
  })

  it('rejects single label hostnames', () => {
    expect(normalizeProfileLinkUrl('localhost')).toBeNull()
    expect(normalizeProfileLinkUrl('https://localhost')).toBeNull()
    expect(normalizeProfileLinkUrl('mycomputer')).toBeNull()
  })

  it('rejects numeric or invalid TLDs', () => {
    expect(normalizeProfileLinkUrl('192.168.1.1')).toBeNull()
    expect(normalizeProfileLinkUrl('example.123')).toBeNull()
    expect(normalizeProfileLinkUrl('example.c')).toBeNull()
  })

  it('rejects inputs that cannot be parsed as valid URLs', () => {
    expect(normalizeProfileLinkUrl('')).toBeNull()
    expect(normalizeProfileLinkUrl('   ')).toBeNull()
    expect(normalizeProfileLinkUrl('not a url')).toBeNull()
    expect(normalizeProfileLinkUrl('https://')).toBeNull()
  })

  it('trims whitespace around input', () => {
    expect(normalizeProfileLinkUrl('  https://example.com/test  ')).toBe('https://example.com/test')
    expect(normalizeProfileLinkUrl('  github.com  ')).toBe('https://github.com/')
  })
})

describe('rules: hostMatchesDomain and domain checks', () => {
  it('matches exact domain and subdomains', () => {
    expect(hostMatchesDomain('ko-fi.com', 'ko-fi.com')).toBe(true)
    expect(hostMatchesDomain('sub.ko-fi.com', 'ko-fi.com')).toBe(true)
    expect(hostMatchesDomain('a.b.ko-fi.com', 'ko-fi.com')).toBe(true)
  })

  it('does not match lookalikes or parent domains', () => {
    expect(hostMatchesDomain('notko-fi.com', 'ko-fi.com')).toBe(false)
    expect(hostMatchesDomain('ko-fi.com.evil.com', 'ko-fi.com')).toBe(false)
    expect(hostMatchesDomain('com', 'ko-fi.com')).toBe(false)
  })

  it('identifies shortener domains and their subdomains vs lookalikes', () => {
    expect(isShortenerLink('https://bit.ly/123')).toBe(true)
    expect(isShortenerLink('https://sub.bit.ly/123')).toBe(true)
    expect(isShortenerLink('https://t.co/abc')).toBe(true)
    expect(isShortenerLink('https://tinyurl.com/xyz')).toBe(true)
    expect(isShortenerLink('https://notbit.ly/123')).toBe(false)
    expect(isShortenerLink('https://bit.ly.attacker.com/123')).toBe(false)
    expect(isShortenerLink('https://example.com/bit.ly')).toBe(false)
  })

  it('identifies blocked domains and subdomains vs lookalikes', () => {
    expect(isBlockedProfileLink('https://fansly.com/user')).toBe(true)
    expect(isBlockedProfileLink('https://sub.onlyfans.com/user')).toBe(true)
    expect(isBlockedProfileLink('https://videy.at/v?id=123')).toBe(true)
    expect(isBlockedProfileLink('https://notfansly.com/user')).toBe(false)
    expect(isBlockedProfileLink('https://onlyfans.com.fake.org/user')).toBe(false)
  })

  it('detects insecure http links', () => {
    expect(isInsecureLink('http://example.com')).toBe(true)
    expect(isInsecureLink('https://example.com')).toBe(false)
    expect(isInsecureLink('ftp://example.com')).toBe(false)
  })
})

describe('rules: formatLinkUrl and getLinkHost', () => {
  it('formats link url by stripping protocol, www, and trailing slash', () => {
    expect(formatLinkUrl('https://www.example.com/page/')).toBe('example.com/page')
    expect(formatLinkUrl('http://example.com/')).toBe('example.com')
    expect(formatLinkUrl('https://sub.example.com/')).toBe('sub.example.com')
  })

  it('extracts link host without www', () => {
    expect(getLinkHost('https://www.example.com/path')).toBe('example.com')
    expect(getLinkHost('https://sub.example.com/path')).toBe('sub.example.com')
    expect(getLinkHost('invalid-url')).toBe('invalid-url')
  })
})

describe('rules: getSupportProvider', () => {
  it('does not count bare homepages as support providers', () => {
    expect(getSupportProvider('https://ko-fi.com')).toBeUndefined()
    expect(getSupportProvider('https://ko-fi.com/')).toBeUndefined()
    expect(getSupportProvider('https://www.ko-fi.com/')).toBeUndefined()
    expect(getSupportProvider('https://patreon.com')).toBeUndefined()
    expect(getSupportProvider('https://buymeacoffee.com')).toBeUndefined()
  })

  it('matches provider accounts with path', () => {
    const kofi = getSupportProvider('https://ko-fi.com/alice')
    expect(kofi?.name).toBe('Ko-fi')
    expect(kofi?.logo).toBe('KoFi')

    const patreon = getSupportProvider('https://patreon.com/artist')
    expect(patreon?.name).toBe('Patreon')
  })

  it('matches provider accounts with subdomain', () => {
    const itch = getSupportProvider('https://developer.itch.io')
    expect(itch?.name).toBe('itch.io')

    const bigcartel = getSupportProvider('https://shop.bigcartel.com')
    expect(bigcartel?.name).toBe('Big Cartel')
  })

  it('matches providers with specific pathPrefix', () => {
    expect(getSupportProvider('https://chuffed.org/campaign/clean-water')?.name).toBe('Chuffed')
    expect(getSupportProvider('https://chuffed.org/project/solar')?.name).toBe('Chuffed')
    expect(getSupportProvider('https://chuffed.org/about')).toBeUndefined()

    expect(getSupportProvider('https://inprnt.com/gallery/art')?.name).toBe('INPRNT')
    expect(getSupportProvider('https://inprnt.com/art')).toBeUndefined()

    expect(getSupportProvider('https://paypal.com/paypalme/alice')?.name).toBe('PayPal')
    expect(getSupportProvider('https://paypal.me/alice')?.name).toBe('PayPal')
    expect(getSupportProvider('https://paypal.com/myaccount')).toBeUndefined()

    expect(getSupportProvider('https://buy.stripe.com/pay123')?.name).toBe('Stripe')
    expect(getSupportProvider('https://donate.stripe.com/don123')?.name).toBe('Stripe')
    expect(getSupportProvider('https://stripe.com/pricing')).toBeUndefined()
  })

  it('rejects lookalike domains for support providers', () => {
    expect(getSupportProvider('https://ko-fi.com.attacker.com/alice')).toBeUndefined()
    expect(getSupportProvider('https://notpatreon.com/alice')).toBeUndefined()
  })
})

describe('rules: graphemeLength and validateTitle', () => {
  it('counts graphemes correctly across ascii, cjk, accents and emojis', () => {
    expect(graphemeLength('hello')).toBe(5)
    expect(graphemeLength('日本語')).toBe(3)
    expect(graphemeLength('e\u0301')).toBe(1) // é combining
    expect(graphemeLength('👨‍💻')).toBe(1) // technologist ZWJ sequence
    expect(graphemeLength('🇧🇷')).toBe(1) // flag
  })

  it('validates titles within limits', () => {
    expect(validateTitle('   ')).toEqual({ value: undefined, issues: [] })
    expect(validateTitle('Valid Title')).toEqual({ value: 'Valid Title', issues: [] })
    expect(validateTitle('  Trimmed Title  ')).toEqual({ value: 'Trimmed Title', issues: [] })
  })

  it('detects titles exceeding maximum graphemes', () => {
    const longGraphemes = 'a'.repeat(TITLE_MAX_GRAPHEMES + 1)
    const result = validateTitle(longGraphemes)
    expect(result.issues).toContain('too-long-graphemes')
    expect(result.issues).not.toContain('too-long-bytes')
  })

  it('detects titles exceeding maximum bytes (UTF-8)', () => {
    // Each complex emoji sequence below is 1 grapheme but ~25 bytes
    // 35 * 25 = 875 bytes > 320 bytes, but 35 graphemes <= 40
    const manyEmojiBytes = '👨‍👩‍👧‍👦'.repeat(35)
    expect(graphemeLength(manyEmojiBytes)).toBe(35)
    const result = validateTitle(manyEmojiBytes)
    expect(result.issues).toContain('too-long-bytes')
    expect(result.issues).not.toContain('too-long-graphemes')
  })

  it('detects both grapheme and byte overages', () => {
    const wayTooBig = '👨‍👩‍👧‍👦'.repeat(45)
    const result = validateTitle(wayTooBig)
    expect(result.issues).toContain('too-long-graphemes')
    expect(result.issues).toContain('too-long-bytes')
  })
})

describe('rules: validateIcon', () => {
  it('accepts valid mime types and sizes', () => {
    for (const mime of ICON_MIME) {
      expect(validateIcon({ type: mime, size: ICON_MAX_BYTES })).toEqual([])
      expect(validateIcon({ type: mime, size: 50_000 })).toEqual([])
    }
  })

  it('flags unsupported mime types', () => {
    expect(validateIcon({ type: 'image/gif', size: 1000 })).toEqual(['bad-type'])
    expect(validateIcon({ type: 'image/svg+xml', size: 1000 })).toEqual(['bad-type'])
    expect(validateIcon({ type: 'application/json', size: 1000 })).toEqual(['bad-type'])
  })

  it('flags icons exceeding maximum size', () => {
    expect(validateIcon({ type: 'image/png', size: ICON_MAX_BYTES + 1 })).toEqual(['too-big'])
  })

  it('flags both invalid type and oversized payload', () => {
    expect(validateIcon({ type: 'image/svg+xml', size: ICON_MAX_BYTES + 10 })).toEqual([
      'bad-type',
      'too-big',
    ])
  })
})

describe('rules: validateLink', () => {
  it('detects empty input', () => {
    const res = validateLink('', { existingCount: 0, editing: false })
    expect(res.issues).toEqual(['empty'])
    expect(res.url).toBeNull()
  })

  it('detects invalid URLs', () => {
    const res = validateLink('invalid url', { existingCount: 0, editing: false })
    expect(res.issues).toEqual(['invalid'])
    expect(res.url).toBeNull()
  })

  it('detects insecure http URLs', () => {
    const res = validateLink('http://example.com', { existingCount: 0, editing: false })
    expect(res.issues).toContain('insecure')
    expect(res.url).toBeNull()
  })

  it('detects blocked domains', () => {
    const res = validateLink('https://fansly.com/user', { existingCount: 0, editing: false })
    expect(res.issues).toContain('blocked')
    expect(res.url).toBeNull()
  })

  it('detects shortener links', () => {
    const res = validateLink('https://bit.ly/12345', { existingCount: 0, editing: false })
    expect(res.issues).toContain('shortener')
    expect(res.url).toBeNull()
  })

  it('enforces link count limit when adding a new link', () => {
    const atMax = validateLink('https://example.com/link', {
      existingCount: MAX_PROFILE_LINKS,
      editing: false,
    })
    expect(atMax.issues).toContain('too-many')
    expect(atMax.url).toBeNull()

    const underMax = validateLink('https://example.com/link', {
      existingCount: MAX_PROFILE_LINKS - 1,
      editing: false,
    })
    expect(underMax.issues).toEqual([])
    expect(underMax.url).toBe('https://example.com/link')
  })

  it('allows saving when editing even if existingCount is at or above maximum', () => {
    const editing = validateLink('https://example.com/link', {
      existingCount: MAX_PROFILE_LINKS,
      editing: true,
    })
    expect(editing.issues).toEqual([])
    expect(editing.url).toBe('https://example.com/link')
  })

  it('returns canonical https URL and matched support provider', () => {
    const res = validateLink('ko-fi.com/artist', { existingCount: 2, editing: false })
    expect(res.issues).toEqual([])
    expect(res.url).toBe('https://ko-fi.com/artist')
    expect(res.provider?.name).toBe('Ko-fi')
  })

  it('returns provider only when issues is empty', () => {
    // 1. Insecure http provider url -> has issues ['insecure'], provider must be undefined
    const insecure = validateLink('http://ko-fi.com/artist', { existingCount: 0, editing: false })
    expect(insecure.issues).toContain('insecure')
    expect(insecure.provider).toBeUndefined()

    // 2. Provider url with too-many links -> has issues ['too-many'], provider must be undefined
    const tooMany = validateLink('https://ko-fi.com/artist', { existingCount: MAX_PROFILE_LINKS, editing: false })
    expect(tooMany.issues).toContain('too-many')
    expect(tooMany.provider).toBeUndefined()

    // 3. Valid link with no provider -> provider undefined
    const noProvider = validateLink('https://example.com', { existingCount: 0, editing: false })
    expect(noProvider.issues).toEqual([])
    expect(noProvider.provider).toBeUndefined()
  })
})
