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

  // Like down.blue, the language button names where a tap takes you: the other
  // language, in that language.
  const language = el('button', { className: 'db-btn db-btn-sm cast press', attrs: { type: 'button', id: 'language' } })
  language.addEventListener('click', () => {
    setLocale(otherLocale(getLocale()))
  })

  const themeLabel = el('span')
  const theme = el('button', { className: 'db-btn db-btn-sm cast press theme-switch', attrs: { type: 'button', id: 'theme' } },
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

  const status = el('p', { className: 'sr', attrs: { role: 'status' } })
  const main = el('main', { attrs: { id: 'content' } })

  const header = el('header', {},
    el('div', { className: 'flex flex-wrap items-center justify-end gap-2 pt-4' }, language, theme),
    el('div', { className: 'db-wordmark' },
      el('a', { attrs: { href: '/', 'aria-label': 'links.notx.blue' } },
        el('span', { className: 'ink-block tilt-cw' }, 'links'),
        el('span', { className: 'wordmark-suffix' }, '.notx.blue'),
      ),
    ),
  )

  const footerStatus = el('span')
  const bug = el('a', { attrs: { target: '_blank', rel: 'noopener' } })
  const partOf = el('span')
  const byAuthor = el('span')
  const viewSource = el('a', { attrs: { href: SOURCE_URL } })
  const privacy = el('a', { attrs: { href: PRIVACY_URL } })
  const abuse = el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` } })
  const fromBrazil = el('p', { className: 'db-note mb-6 text-center' })
  const support = el('span', { className: 'db-micro mr-1 text-text-3' })
  const chip = (kind: string, href: string, label: string) =>
    el('a', { className: `db-chip db-chip-${kind} cast press`, attrs: { href, target: '_blank', rel: 'noopener' }, text: label })
  const footer = el('footer', { className: 'pt-6' },
    el('p', { className: 'db-meta mb-6 text-center' },
      footerStatus, ' · ', bug, ' · ', partOf, ' ', el('a', { attrs: { href: 'https://notx.blue' }, text: 'notx.blue' }), ' ', byAuthor, ' ',
      el('a', { attrs: { href: AUTHOR_PROFILE }, text: '@joseli.to' }), ' · ', viewSource, ' · ', privacy, ' · ', abuse,
    ),
    fromBrazil,
    el('div', { className: 'mb-6 flex flex-wrap items-center justify-center gap-2' },
      support,
      chip('pix', 'https://pix.joseli.to', 'Pix'),
      chip('coffee', 'https://buymeacoffee.com/joselito', 'Buy Me a Coffee'),
      chip('sponsors', 'https://github.com/sponsors/breakzplatform', 'GitHub Sponsors'),
    ),
  )

  root.replaceChildren(
    el('div', { className: 'mx-auto max-w-[880px] px-6 pb-16' }, skip, header, status, main, footer),
  )

  const shell: Shell = {
    main,
    refresh() {
      document.title = t('appTitle')
      setText(skip, t('skip'))
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
