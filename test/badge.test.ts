// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { initLocale, t } from '../src/i18n'
import { getSupportProvider } from '../src/lib/rules'
import { blueskyIconBadge } from '../src/ui/badge'
import { renderLinks } from '../src/ui/links'
import type { LinkView } from '../src/lib/profile-links'

function view(rkey: string, url: string): LinkView {
  return { uri: `at://did:plc:x/app.bsky.actor.link/${rkey}`, cid: 'c', rkey, stale: false, record: { url, title: rkey } as never }
}

describe('Bluesky icon badge', () => {
  beforeEach(() => initLocale())

  it('detects Buy Me a Coffee account links but not the bare homepage', () => {
    expect(getSupportProvider('https://buymeacoffee.com/joselito')).toBeDefined()
    expect(getSupportProvider('https://buymeacoffee.com')).toBeUndefined()
    expect(getSupportProvider('https://example.com/a')).toBeUndefined()
  })

  it('carries the label and a tooltip', () => {
    const badge = blueskyIconBadge()
    expect(badge.textContent).toBe(t('blueskyIconBadge'))
    expect(badge.title).toBe(t('blueskyIconBadgeTip'))
    expect(badge.getAttribute('aria-label')).toContain(t('blueskyIconBadgeTip'))
  })

  it('renders the badge only on matching rows of the list', () => {
    const main = document.createElement('main')
    renderLinks(main, {
      did: 'did:plc:x', profile: null, busy: false, error: '', repair: false, confirm: null,
      shown: [view('coffee', 'https://buymeacoffee.com/joselito'), view('site', 'https://example.com/a')],
      hidden: [],
      onSignOut() {}, onAdd() {}, onEdit() {}, onMove() {}, onAddBack() {}, onAsk() {}, onConfirm() {}, onRepair() {},
    })
    const rows = main.querySelectorAll('ol.links > li')
    expect(rows[0]!.querySelector('.db-chip-bsky')).not.toBeNull()
    expect(rows[1]!.querySelector('.db-chip-bsky')).toBeNull()
    expect(rows[0]!.classList.contains('green')).toBe(true)
    expect(rows[1]!.classList.contains('green')).toBe(false)
  })
})
