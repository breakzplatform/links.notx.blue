import { ABUSE_CONTACT } from '../lib/config'
import { getLocale, setLocale, t, type Locale } from '../i18n'
import { el, setText } from './dom'

export type Shell = {
  main: HTMLElement
  refresh(): void
  setStatus(message: string): void
  setBusy(busy: boolean): void
}

export function createShell(root: HTMLElement): Shell {
  const skip = el('a', { className: 'skip', attrs: { href: '#content' } })
  const brand = el('a', { className: 'brand', attrs: { href: '/' } })
  const languageLabel = el('label', { attrs: { for: 'language' } })
  const language = el('select', { attrs: { id: 'language' } },
    el('option', { attrs: { value: 'pt-BR' }, text: 'Português' }),
    el('option', { attrs: { value: 'en' }, text: 'English' }),
  )
  language.value = getLocale()
  language.addEventListener('change', () => {
    const next: Locale = language.value === 'en' ? 'en' : 'pt-BR'
    setLocale(next)
  })

  const status = el('p', { className: 'status', attrs: { role: 'status' } })
  const main = el('main', { attrs: { id: 'content' } })
  const privacy = el('a')
  const abuse = el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` }, text: ABUSE_CONTACT })

  const header = el('header', { className: 'bar' },
    brand,
    el('div', { className: 'language' }, languageLabel, language),
  )
  const footer = el('footer', {}, privacy, abuse)

  root.replaceChildren(
    el('div', { className: 'wrap' }, skip, header, status, main, footer),
  )

  const shell: Shell = {
    main,
    refresh() {
      const privacyPage = /\/privacy(\.html)?\/?$/.test(location.pathname)
      document.title = privacyPage ? t('privacyDocumentTitle') : t('appTitle')
      setText(skip, t('skip'))
      setText(brand, t('appTitle'))
      setText(languageLabel, t('languageLabel'))
      setText(privacy, t('privacyLink'))
      privacy.href = privacyHref()
      if (language.value !== getLocale()) language.value = getLocale()
    },
    setStatus(message) {
      setText(status, message)
    },
    setBusy(busy) {
      main.setAttribute('aria-busy', busy ? 'true' : 'false')
    },
  }
  shell.refresh()
  return shell
}

function privacyHref(): string {
  // Vite dev serves the page at /privacy.html. Production html_handling
  // serves that file at /privacy.
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return '/privacy.html'
  return '/privacy'
}
