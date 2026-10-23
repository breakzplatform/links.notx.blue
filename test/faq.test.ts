// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { getLocale, initLocale, setLocale, t } from '../src/i18n'
import { ABUSE_CONTACT } from '../src/lib/config'
import { getSupportProvider, ICON_MAX_BYTES, isShortenerLink, SHORTENER_DOMAINS, SUPPORT_PROVIDERS } from '../src/lib/rules'
import { FAQ_ITEMS, renderFaq } from '../src/ui/faq'

describe('FAQ', () => {
  it('has a question and an answer in both languages', () => {
    initLocale()
    for (const locale of ['pt-BR', 'en'] as const) {
      setLocale(locale)
      expect(getLocale()).toBe(locale)
      for (const [question, answer] of FAQ_ITEMS) {
        expect(t(question).length).toBeGreaterThan(5)
        expect(t(answer).length).toBeGreaterThan(40)
      }
    }
  })

  it('renders one collapsible item per entry', () => {
    setLocale('en')
    const faq = renderFaq()
    expect(faq.querySelectorAll('details')).toHaveLength(FAQ_ITEMS.length)
  })

  it('names rejection reasons that the validation really enforces', () => {
    setLocale('en')
    const answer = t('faqRejectedA')
    expect(SHORTENER_DOMAINS).toContain('bit.ly')
    expect(isShortenerLink('https://videy.at/v/abc')).toBe(true)
    expect(answer).toContain('bit.ly')
    expect(answer).toContain('videy.at')
    expect(answer).toContain('https')
  })

  it('says the checks do not follow redirects, and does not call the blocklist unbeatable', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      setLocale(locale)
      expect(t('faqRejectedA')).toMatch(/redirect|redirecion/)
      expect(t('faqRejectedA')).not.toMatch(/cannot be worked around|Não há como contornar/)
    }
  })

  it('explains green links with providers that the rules really recognize', () => {
    setLocale('en')
    const answer = t('faqGreenA')
    for (const name of ['Patreon', 'Ko-fi', 'Buy Me a Coffee', 'GoFundMe', 'Open Collective', 'Liberapay', 'Substack', 'itch.io', 'Etsy', 'Kickstarter']) {
      expect(answer).toContain(name)
      expect(SUPPORT_PROVIDERS.some(provider => provider.name === name)).toBe(true)
    }
    expect(getSupportProvider('https://ko-fi.com/joselito')?.name).toBe('Ko-fi')
    expect(getSupportProvider('https://ko-fi.com')).toBeUndefined()
    expect(getSupportProvider('https://fanbox.cc/@kat')?.name).toBe('pixivFANBOX')
  })

  it('states the real icon size limit', () => {
    setLocale('en')
    expect(ICON_MAX_BYTES).toBe(100_000)
    expect(t('faqImageA')).toContain('100 kB')
    expect(t('faqImageA')).toContain('10 MB')
  })

  it('does not ship a privacy page or the old abuse address', () => {
    expect(ABUSE_CONTACT).toBe('abuse@notx.blue')
  })
})
