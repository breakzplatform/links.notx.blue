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
    onSignIn: (handle: string) => void
    onBsky: () => void
  },
): void {
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
  handle.disabled = options.busy
  const submit = el('button', { className: 'db-btn db-btn-primary shrink-0 px-3 cast press', attrs: { type: 'submit', 'aria-label': t('signIn'), title: t('signIn') } }, icon('arrow-right', 18))
  submit.disabled = options.busy
  const bsky = el('button', { className: 'link-button', attrs: { type: 'button', id: 'bsky-sign-in' }, text: t('signInBsky') })
  bsky.disabled = options.busy
  bsky.addEventListener('click', () => options.onBsky())
  const handleError = el('p', { className: 'db-note db-status-error mt-4', attrs: { id: 'handle-error', role: 'alert' } })
  handleError.hidden = true

  const form = el('form', { className: 'flex flex-wrap gap-2' },
    el('span', { className: 'db-field cast min-w-0 flex-1' }, handle),
    submit,
  )
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

  const error = el('p', { className: 'alert mb-6', attrs: { role: 'alert' }, text: options.error })
  error.hidden = options.error.length === 0

  main.replaceChildren(
    error,
    el('section', { className: 'db-panel cast mt-15 mb-6', attrs: { 'aria-labelledby': 'page-title' } },
      el('h1', { className: 'db-panel-head', attrs: { id: 'page-title', tabindex: '-1' } }, el('span', { text: t('signInTitle') })),
      el('div', { className: 'p-4' },
        el('p', { className: 'mb-5' }, el('strong', { text: t('leadStrong') }), ' ', t('leadRest')),
        form,
        handleError,
        el('p', { className: 'db-note mt-4', attrs: { id: 'handle-note' } }, `${t('signInNote')} `, bsky),
      ),
    ),
    renderFaq(),
    renderPromo(),
  )
}

function renderPromo(): HTMLElement {
  return el('aside', { className: 'db-callout db-callout-promo cast mb-9' },
    el('span', { className: 'db-callout-spine', attrs: { role: 'img', 'aria-label': t('promoLabel'), title: t('promoLabel') } }, icon('star', 18)),
    el('div', { className: 'db-callout-body' },
      `${t('promoLead')} `,
      el('a', { attrs: { href: 'https://down.blue' }, text: 'down.blue' }),
      '.',
    ),
  )
}
