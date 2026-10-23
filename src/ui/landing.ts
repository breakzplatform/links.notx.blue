import './landing.css'
import { t } from '../i18n'
import { normalizeSignInInput } from '../oauth'
import { el } from './dom'
import { icon } from './icons'
import { renderFaq } from './faq'

export function renderLanding(
  main: HTMLElement,
  options: {
    busy: boolean
    error: string
    status?: string
    onSignIn: (handle: string) => void
    onBsky: () => void
  },
): void {
  const previousHandle = main.querySelector<HTMLInputElement>('#handle')?.value ?? ''
  const expanded = main.querySelector('[aria-controls="handle-form"]')?.getAttribute('aria-expanded') === 'true'
  const handle = el('input', {
    className: 'db-input',
    attrs: {
      id: 'handle',
      name: 'handle',
      type: 'text',
      inputmode: 'url',
      autocomplete: 'username',
      autocapitalize: 'off',
      spellcheck: 'false',
      placeholder: t('handleHint'),
      'aria-label': t('handleLabel'),
      'aria-describedby': 'handle-note',
    },
  })
  handle.value = previousHandle
  handle.disabled = options.busy
  const submit = el('button', { className: 'db-btn db-btn-primary cast press', attrs: { type: 'submit' }, text: t('signInContinue') })
  submit.disabled = options.busy
  const bsky = el('button', { className: 'db-btn db-btn-primary cast press', attrs: { type: 'button', id: 'bsky-sign-in' }, text: t('signInWithBluesky') })
  bsky.disabled = options.busy
  bsky.addEventListener('click', () => options.onBsky())
  const other = el('button', { className: 'db-btn cast press', attrs: { type: 'button', id: 'other-sign-in', 'aria-expanded': String(expanded), 'aria-controls': 'handle-form' }, text: t('signInOther') })
  other.disabled = options.busy
  const handleError = el('p', { className: 'db-note db-status-error mt-4', attrs: { id: 'handle-error', role: 'alert' } })
  handleError.hidden = true

  const form = el('form', { className: 'signin-form', attrs: { id: 'handle-form' } },
    el('label', { attrs: { for: 'handle' }, text: t('handleLabel') }),
    el('div', { className: 'signin-input-row' },
      el('span', { className: 'db-field cast' }, handle),
      submit,
    ),
    el('p', { className: 'db-note', attrs: { id: 'handle-note' }, text: t('signInExplain') }),
    handleError,
  )
  form.hidden = !expanded
  other.addEventListener('click', () => {
    form.hidden = !form.hidden
    other.setAttribute('aria-expanded', String(!form.hidden))
    if (!form.hidden) handle.focus()
  })
  form.addEventListener('submit', event => {
    event.preventDefault()
    if (options.busy) return
    const value = normalizeSignInInput(handle.value)
    if (!value) {
      handleError.hidden = false
      handleError.textContent = t('handleRequired')
      handle.setAttribute('aria-invalid', 'true')
      handle.setAttribute('aria-describedby', 'handle-note handle-error')
      handle.focus()
      return
    }
    handleError.hidden = true
    handle.removeAttribute('aria-invalid')
    handle.setAttribute('aria-describedby', 'handle-note')
    options.onSignIn(value)
  })

  const error = el('p', { className: 'alert', attrs: { role: 'alert' }, text: options.error })
  error.hidden = options.error.length === 0

  main.replaceChildren(
    el('section', { className: 'db-panel cast signin-panel', attrs: { 'aria-labelledby': 'page-title' } },
      el('h1', { className: 'db-panel-head', attrs: { id: 'page-title', tabindex: '-1' } }, el('span', { text: t('signInTitle') })),
      el('div', { className: 'signin-body' },
        el('p', {}, el('strong', { text: t('leadStrong') }), ' ', t('leadRest')),
        el('p', { className: 'signin-atmosphere' }, el('strong', { text: t('signInAtmosphere') })),
        el('div', { className: 'signin-choices' }, bsky, other),
        form,
        el('p', { className: 'db-note signin-status', text: options.status ?? '' }),
        error,
      ),
    ),
    renderFaq(),
    renderPromo(),
  )
}

export function renderPromo(): HTMLElement {
  return el('aside', { className: 'db-callout db-callout-promo cast mb-9' },
    el('span', { className: 'db-callout-spine', attrs: { role: 'img', 'aria-label': t('promoLabel'), title: t('promoLabel') } }, icon('star', 18)),
    el('div', { className: 'db-callout-body' },
      `${t('promoLead')} `,
      el('a', { attrs: { href: 'https://down.blue' }, text: 'down.blue' }),
      '.',
    ),
  )
}
