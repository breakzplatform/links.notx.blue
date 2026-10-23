// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { initLocale } from '../src/i18n'
import { createEditorState, renderEditor } from '../src/ui/editor'

describe('editor preview', () => {
  it('draws the Bluesky pill in light and dark and marks the edited link', () => {
    initLocale()
    const main = document.createElement('main')
    document.body.append(main)
    const link = { uri: 'at://x/1', cid: 'c', rkey: 'r', stale: false, record: { $type: 'app.bsky.actor.link', url: 'https://example.com', title: 'My site' } } as never
    renderEditor(main, { state: createEditorState(link), shownCount: 1, link, xrpc: null, onBack() {}, onSaved() {}, onSaveFailed() {}, onConflict() {}, onStatus() {} })
    expect(main.querySelector('.bsky-light')).not.toBeNull()
    expect(main.querySelector('.bsky-dark')).not.toBeNull()
    const current = main.querySelectorAll('.bsky-pill[aria-current="true"]')
    expect(current).toHaveLength(2)
    for (const pill of current) expect(pill.textContent).toContain('My site')
  })
})
