import { ABUSE_CONTACT } from '../lib/config'
import { t } from '../i18n'
import { el } from './dom'

export function renderPrivacy(main: HTMLElement): void {
  main.replaceChildren(
    el('article', { className: 'stack prose' },
      el('h1', { attrs: { id: 'page-title', tabindex: '-1' }, text: t('privacyH1') }),
      el('p', { text: t('privacyIntro') }),
      section(t('privacyBrowserTitle'), t('privacyBrowser')),
      section(t('privacyTokensTitle'), t('privacyTokens')),
      section(t('privacyStoreTitle'), t('privacyStore')),
      section(t('privacyProxyTitle'), t('privacyProxy')),
      section(t('privacyPublicTitle'), t('privacyPublic')),
      el('section', {},
        el('h2', { text: t('privacyContactTitle') }),
        contactLine(),
      ),
    ),
  )
}

function section(title: string, body: string): HTMLElement {
  return el('section', {}, el('h2', { text: title }), el('p', { text: body }))
}

function contactLine(): HTMLElement {
  const [before, after] = t('privacyContact', { email: '\u0000' }).split('\u0000')
  return el('p', {},
    before ?? '',
    el('a', { attrs: { href: `mailto:${ABUSE_CONTACT}` }, text: ABUSE_CONTACT }),
    after ?? '',
  )
}
