import { t } from '../i18n'
import { normalizeSignInInput } from '../oauth'
import { el } from './dom'

export function renderLanding(
  main: HTMLElement,
  options: {
    busy: boolean
    error: string
    onSignIn: (handle: string) => void
    onBsky: () => void
    onDemo: () => void
  },
): void {
  const handle = el('input', {
    attrs: {
      id: 'handle',
      name: 'handle',
      type: 'text',
      autocomplete: 'username',
      autocapitalize: 'off',
      spellcheck: 'false',
    },
  })
  handle.disabled = options.busy
  const handleError = el('p', { className: 'field-error', attrs: { id: 'handle-error', role: 'alert' } })
  handleError.hidden = true

  const form = el('form', { className: 'stack' },
    el('div', { className: 'field' },
      el('label', { attrs: { for: 'handle' }, text: t('handleLabel') }),
      handle,
      el('p', { className: 'hint', attrs: { id: 'handle-hint' }, text: t('handleHint') }),
      handleError,
    ),
    el('div', { className: 'actions' },
      el('button', { className: 'primary', attrs: { type: 'submit' }, text: t('signIn') }),
      el('button', { attrs: { type: 'button', id: 'bsky-sign-in' }, text: t('signInBsky') }),
    ),
  )
  const submit = form.querySelector('button[type="submit"]')
  const bsky = form.querySelector('#bsky-sign-in')
  if (submit instanceof HTMLButtonElement) submit.disabled = options.busy
  if (bsky instanceof HTMLButtonElement) {
    bsky.disabled = options.busy
    bsky.addEventListener('click', () => options.onBsky())
  }
  handle.setAttribute('aria-describedby', 'handle-hint')
  form.addEventListener('submit', event => {
    event.preventDefault()
    const value = normalizeSignInInput(handle.value)
    if (!value) {
      handleError.hidden = false
      handleError.textContent = t('handleRequired')
      handle.setAttribute('aria-invalid', 'true')
      handle.focus()
      return
    }
    handleError.hidden = true
    handle.removeAttribute('aria-invalid')
    options.onSignIn(value)
  })

  const error = el('p', { className: 'alert', attrs: { role: 'alert' }, text: options.error })
  error.hidden = options.error.length === 0

  main.replaceChildren(
    el('section', { className: 'stack' },
      el('h1', { attrs: { id: 'page-title', tabindex: '-1' }, text: t('landingTitle') }),
      el('p', { text: t('landingLead') }),
      error,
      form,
      el('p', { text: t('privacySummary') }),
      el('p', {}, el('a', { attrs: { href: privacyLink() }, text: t('privacyLink') })),
      el('p', {}, el('button', { attrs: { type: 'button', id: 'try-editor' }, text: t('tryEditor') })),
    ),
  )
  const demo = main.querySelector('#try-editor')
  if (demo instanceof HTMLButtonElement) {
    demo.disabled = options.busy
    demo.addEventListener('click', () => options.onDemo())
  }
}

function privacyLink(): string {
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return '/privacy.html'
  return '/privacy'
}
