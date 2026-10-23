import { ABUSE_CONTACT } from '../lib/config'
import { getLocale, setLocale, t, type Locale, type MessageKey } from '../i18n'
import { el, setText } from './dom'
import { icon } from './icons'
import { cycleTheme, getTheme, nextTheme, onRemoteThemeChange, type Theme } from './theme'

const THEME_KEYS: Record<Theme, MessageKey> = {
  light: 'themeLight',
  dark: 'themeDark',
  terminal: 'themeTerminal',
}

export type Shell = {
  main: HTMLElement
  refresh(): void
  setStatus(message: string): void
  setBusy(busy: boolean): void
}

export function createShell(root: HTMLElement): Shell {
  const skip = el('a', { className: 'skip', attrs: { href: '#content' } })
  const brandName = el('span', { className: 'brand-name' })
  const brand = el('a', { className: 'brand', attrs: { href: '/' } },
    el('span', { className: 'wordmark', attrs: { 'aria-hidden': 'true' } },
      'links',
      el('span', { className: 'tld ink-block tilt' }, '.notx.blue'),
    ),
    brandName,
  )
  const languageLabel = el('label', { className: 'label', attrs: { for: 'language' } })
  const language = el('select', { attrs: { id: 'language' } },
    el('option', { attrs: { value: 'pt-BR' }, text: 'Português' }),
    el('option', { attrs: { value: 'en' }, text: 'English' }),
  )
  language.value = getLocale()
  language.addEventListener('change', () => {
    const next: Locale = language.value === 'en' ? 'en' : 'pt-BR'
    setLocale(next)
  })

  const themeLabel = el('span')
  const theme = el('button', { className: 'btn sm cast press theme-switch', attrs: { type: 'button', id: 'theme' } },
    icon('sun'),
    icon('moon'),
    icon('terminal'),
    themeLabel,
  )
  const syncTheme = () => {
    const current = getTheme()
    const next = nextTheme(current)
    theme.dataset.nextTheme = next
    setText(themeLabel, t(THEME_KEYS[next]))
    theme.setAttribute('aria-label', t('themeAria', { current: t(THEME_KEYS[current]), next: t(THEME_KEYS[next]) }))
  }
  theme.addEventListener('click', () => {
    cycleTheme()
    syncTheme()
  })
  onRemoteThemeChange(syncTheme)

  const status = el('p', { className: 'status', attrs: { role: 'status' } })
  const main = el('main', { attrs: { id: 'content' } })
  const privacy = el('a')
  const abuse = el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` }, text: ABUSE_CONTACT })

  const header = el('header', { className: 'site-head' },
    brand,
    el('div', { className: 'controls' },
      el('div', { className: 'language' },
        languageLabel,
        el('span', { className: 'field cast' }, language),
      ),
      theme,
    ),
  )
  const footer = el('footer', { className: 'site-foot' },
    el('span', {}, 'links.notx.blue'),
    el('span', { className: 'site-foot-links' }, privacy, abuse),
  )

  root.replaceChildren(
    el('div', { className: 'wrap' }, skip, header, status, main, footer),
  )

  const shell: Shell = {
    main,
    refresh() {
      const privacyPage = /\/privacy(\.html)?\/?$/.test(location.pathname)
      document.title = privacyPage ? t('privacyDocumentTitle') : t('appTitle')
      setText(skip, t('skip'))
      setText(brandName, t('appTitle'))
      setText(languageLabel, t('languageLabel'))
      setText(privacy, t('privacyLink'))
      privacy.href = privacyHref()
      if (language.value !== getLocale()) language.value = getLocale()
      syncTheme()
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
