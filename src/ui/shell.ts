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

  const header = el('header', { className: 'masthead' },
    el('div', { className: 'controls' }, language, theme),
    el('a', { className: 'wordmark-link', attrs: { href: '/', 'aria-label': 'links.notx.blue' } },
      el('span', { className: 'ink-block tilt' }, 'links'),
      '.notx.blue',
    ),
    tagline,
  )

  const footerStatus = el('span')
  const bug = el('a', { attrs: { target: '_blank', rel: 'noopener' } })
  const partOf = el('span')
  const byAuthor = el('span')
  const viewSource = el('a', { attrs: { href: SOURCE_URL } })
  const privacy = el('a', { attrs: { href: PRIVACY_URL } })
  const abuse = el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` } })
  const fromBrazil = el('p', { className: 'note-line' })
  const support = el('span', { className: 'micro' })
  const footer = el('footer', { className: 'site-foot' },
    el('p', { className: 'meta-line' },
      footerStatus, ' · ', bug, ' · ', partOf, ' ', el('a', { attrs: { href: 'https://notx.blue' }, text: 'notx.blue' }), ' ', byAuthor, ' ',
      el('a', { attrs: { href: AUTHOR_PROFILE }, text: '@joseli.to' }), ' · ', viewSource, ' · ', privacy, ' · ', abuse,
    ),
    fromBrazil,
    el('div', { className: 'support' },
      support,
      el('a', { className: 'chip-link chip-pix cast press', attrs: { href: 'https://pix.joseli.to', target: '_blank', rel: 'noopener' }, text: 'Pix' }),
      el('a', { className: 'chip-link chip-coffee cast press', attrs: { href: 'https://buymeacoffee.com/joselito', target: '_blank', rel: 'noopener' }, text: 'Buy Me a Coffee' }),
      el('a', { className: 'chip-link chip-sponsors cast press', attrs: { href: 'https://github.com/sponsors/breakzplatform', target: '_blank', rel: 'noopener' }, text: 'GitHub Sponsors' }),
    ),
  )

  root.replaceChildren(
    el('div', { className: 'wrap' }, skip, header, status, main, footer),
  )

  const shell: Shell = {
    main,
    refresh() {
      document.title = t('appTitle')
      setText(skip, t('skip'))
      setText(tagline, t('tagline'))
      setText(footerStatus, t('footerStatus'))
      setText(bug, t('foundBug'))
      bug.href = getLocale() === 'en' ? BUG_FORM_EN : BUG_FORM_PT
      setText(partOf, t('partOf'))
      setText(byAuthor, t('byAuthor'))
      setText(viewSource, t('viewSource'))
      setText(abuse, ABUSE_CONTACT)
      setText(fromBrazil, t('fromBrazil'))
      setText(support, t('support'))
      const other = otherLocale(getLocale())
      setText(language, other === 'en' ? 'english' : 'português')
      language.lang = other
      setText(privacy, t('privacyLink'))
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
const SOURCE_URL = 'https://github.com/breakzplatform/links.notx.blue'
const PRIVACY_URL = 'https://notx.blue/privacy'
const BUG_FORM_EN = 'https://q.joseli.to/forms/notx-blue-bugs'
const BUG_FORM_PT = 'https://q.joseli.to/forms/notx-blue-bugs-pt'

function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'pt-BR' : 'en'
}
