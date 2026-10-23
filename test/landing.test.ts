// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { initLocale, setLocale } from '../src/i18n'
import { renderLanding } from '../src/ui/landing'
import { createShell } from '../src/ui/shell'

function landing(): HTMLElement {
  initLocale()
  setLocale('en')
  const main = document.createElement('main')
  renderLanding(main, { busy: false, error: '', onSignIn: () => {}, onBsky: () => {} })
  return main
}

describe('landing', () => {
  it('has one input and one button in the form, like down.blue', () => {
    const form = landing().querySelector('form')!
    expect(form.querySelectorAll('input')).toHaveLength(1)
    expect(form.querySelectorAll('button')).toHaveLength(1)
  })

  it('offers bsky.social as a text link in the fine print, not a button row', () => {
    const main = landing()
    expect(main.querySelector('.db-note #bsky-sign-in')).not.toBeNull()
    expect(main.querySelectorAll('.btn')).toHaveLength(0)
  })

  it('has no separate headline above the panel and promotes down.blue', () => {
    const main = landing()
    expect(main.querySelector('.headline')).toBeNull()
    expect(main.querySelector('.db-callout-promo a[href="https://down.blue"]')).not.toBeNull()
  })
})

describe('shell', () => {
  it('has the wordmark and no tagline under it', () => {
    const root = document.createElement('div')
    createShell(root)
    expect(root.querySelector('.db-wordmark .ink-block.tilt-cw')?.textContent).toBe('links')
    expect(root.querySelector('.db-wordmark + *')).toBeNull()
    expect(root.querySelectorAll('.db-btn-sm')).toHaveLength(2)
  })
})
