import { t } from '../i18n'
import { normalizeSignInInput } from '../oauth'
import { el } from './dom'
import { renderFaq } from './faq'

export function renderLanding(
  main: HTMLElement,
  options: {
    busy: boolean
    error: string
    onSignIn: (handle: string) => void
    onBsky: () => void
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
  const handleError = el('p', { className: 'err', attrs: { id: 'handle-error', role: 'alert' } })
  handleError.hidden = true

  const form = el('form', { className: 'stack' },
    el('div', { className: 'field-block' },
      el('label', { className: 'label', attrs: { for: 'handle' }, text: t('handleLabel') }),
      el('span', { className: 'field cast' }, handle),
      el('p', { className: 'hint', attrs: { id: 'handle-hint' }, text: t('handleHint') }),
      handleError,
    ),
    el('div', { className: 'actions' },
      el('button', { className: 'btn primary cast press', attrs: { type: 'submit' }, text: t('signIn') }),
      el('button', { className: 'btn cast press', attrs: { type: 'button', id: 'bsky-sign-in' }, text: t('signInBsky') }),
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
      el('h1', { className: 'headline', attrs: { id: 'page-title', tabindex: '-1' }, text: t('landingTitle') }),
      el('p', { className: 'lead', text: t('landingLead') }),
      error,
      el('section', { className: 'panel cast sign-in', attrs: { 'aria-labelledby': 'sign-in-title' } },
        el('h2', { className: 'panel-h', attrs: { id: 'sign-in-title' }, text: t('signInTitle') }),
        el('div', { className: 'panel-b stack' },
          el('p', { text: t('signInLead') }),
          form,
        ),
      ),
      renderFaq(),
    ),
  )
}
