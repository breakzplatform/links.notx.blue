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
  const tagline = el('p', { className: 'meta-line text-center' })

  // Like down.blue, the language button names where a tap takes you: the other
  // language, in that language.
  const language = el('button', { className: 'btn sm cast press toggle', attrs: { type: 'button', id: 'language' } })
  language.addEventListener('click', () => {
    setLocale(otherLocale(getLocale()))
  })

  const themeLabel = el('span')
  const theme = el('button', { className: 'btn sm cast press toggle theme-switch', attrs: { type: 'button', id: 'theme' } },
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
  const madeBy = el('span')
  const privacy = el('a')
  const abuse = el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` }, text: ABUSE_CONTACT })

  const header = el('header', { className: 'masthead' },
    el('div', { className: 'flex flex-wrap items-center justify-end gap-2' }, language, theme),
    el('a', { className: 'wordmark-link', attrs: { href: '/', 'aria-label': 'links.notx.blue' } },
      el('span', { className: 'ink-block tilt' }, 'links'),
      '.notx.blue',
    ),
    tagline,
  )
  const footer = el('footer', { className: 'site-foot' },
    el('span', {}, madeBy, ' ', el('a', { attrs: { href: AUTHOR_PROFILE }, text: '@joseli.to' })),
    privacy,
    abuse,
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
      setText(tagline, t('tagline'))
      setText(madeBy, t('madeBy'))
      const other = otherLocale(getLocale())
      setText(language, other === 'en' ? 'english' : 'português')
      language.lang = other
      setText(privacy, t('privacyLink'))
      privacy.href = privacyHref()
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

const AUTHOR_PROFILE = 'https://bsky.app/profile/joseli.to'

function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'pt-BR' : 'en'
}

function privacyHref(): string {
  // Vite dev serves the page at /privacy.html. Production html_handling
  // serves that file at /privacy.
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return '/privacy.html'
  return '/privacy'
}
