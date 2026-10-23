// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { getLocale, initLocale, setLocale, t } from '../src/i18n'
import { ABUSE_CONTACT } from '../src/lib/config'
import { SHORTENER_DOMAINS, BLOCKED_DOMAINS, ICON_MAX_BYTES } from '../src/lib/rules'
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
    expect(BLOCKED_DOMAINS).toContain('onlyfans.com')
    expect(answer).toContain('bit.ly')
    expect(answer).toContain('onlyfans.com')
    expect(answer).toContain('https')
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
