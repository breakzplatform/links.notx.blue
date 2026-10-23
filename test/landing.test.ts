// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initLocale, setLocale, t } from '../src/i18n'
import { renderLanding } from '../src/ui/landing'
import { createShell } from '../src/ui/shell'

beforeEach(() => { initLocale(); setLocale('en') })

function landing(busy = false, status = '') {
  const main = document.createElement('main')
  const onSignIn = vi.fn()
  const onBsky = vi.fn()
  renderLanding(main, { busy, status, error: '', onSignIn, onBsky })
  return { main, onSignIn, onBsky }
}

describe('landing', () => {
  it('offers Bluesky and a toggle for another Atmosphere account', () => {
    const { main, onBsky } = landing()
    expect(main.querySelectorAll('.signin-choices button')).toHaveLength(2)
    main.querySelector<HTMLButtonElement>('#bsky-sign-in')!.click()
    expect(onBsky).toHaveBeenCalledOnce()
    const toggle = main.querySelector<HTMLButtonElement>('[aria-controls="handle-form"]')!
    const form = main.querySelector<HTMLFormElement>('#handle-form')!
    expect(form.hidden).toBe(true)
    toggle.click()
    expect(form.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    toggle.click()
    expect(form.hidden).toBe(true)
  })

  it('validates the handle and submits its normalized value', () => {
    const { main, onSignIn } = landing()
    const form = main.querySelector('form')!
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(main.querySelector('#handle-error')?.textContent).toBe(t('handleRequired'))
    expect(onSignIn).not.toHaveBeenCalled()
    main.querySelector('input')!.value = ' @alice.test '
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(onSignIn).toHaveBeenCalledWith('alice.test')
  })

  it('reserves an in-panel status row and disables every sign-in control while busy', () => {
    const { main } = landing(true, t('signingIn'))
    expect(main.querySelector('.db-panel .signin-status')?.textContent).toBe(t('signingIn'))
    expect([...main.querySelectorAll('button, input')].every(node => (node as HTMLButtonElement).disabled)).toBe(true)
    expect(landing().main.querySelector('.signin-status')?.childNodes).toHaveLength(0)
  })

  it('preserves the expanded form and typed handle across renders', () => {
    const { main } = landing()
    main.querySelector<HTMLButtonElement>('[aria-controls="handle-form"]')!.click()
    main.querySelector('input')!.value = 'alice.test'
    renderLanding(main, { busy: true, error: '', onSignIn: vi.fn(), onBsky: vi.fn() })
    expect(main.querySelector<HTMLFormElement>('form')!.hidden).toBe(false)
    expect(main.querySelector('input')!.value).toBe('alice.test')
  })

  it('keeps the FAQ and promo after the panel', () => {
    const { main } = landing()
    expect(main.querySelector('.headline')).toBeNull()
    expect(main.querySelector('#faq-title')).not.toBeNull()
    expect(main.querySelector('.db-callout-promo a[href="https://down.blue"]')).not.toBeNull()
  })
})

describe('shell', () => {
  it('announces status without adding a visible flow element', () => {
    const root = document.createElement('div')
    const shell = createShell(root)
    shell.setStatus('Loading')
    expect(root.querySelector('[role="status"]')?.className).toBe('sr')
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Loading')
    expect(root.querySelector('.db-wordmark .ink-block.tilt-cw')?.textContent).toBe('links')
  })
})
