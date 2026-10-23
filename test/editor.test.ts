// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initLocale, t } from '../src/i18n'
import { createEditorState, releaseEditor, renderEditor, type EditorState } from '../src/ui/editor'

describe('editor panels', () => {
  let state: EditorState
  let main: HTMLElement
  const onBack = vi.fn()
  const onStatus = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    initLocale()
    state = createEditorState()
    main = document.createElement('main')
    document.body.append(main)
  })
  afterEach(() => {
    releaseEditor(state)
    main.remove()
    vi.useRealTimers()
  })
  function render() {
    renderEditor(main, { state, shownCount: 0, xrpc: null, onBack, onStatus, onSaved() {}, onSaveFailed() {}, onConflict() {} })
  }
  function input(id: string, value: string) {
    const field = main.querySelector<HTMLInputElement>(`#${id}`)!
    field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  it('places the back control and focusable page title in the address panel head', () => {
    render()
    const heading = main.querySelector('h1.db-panel-head#page-title')!
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(heading.textContent).toContain(t('editorNew'))
    const back = heading.querySelector('button')!
    expect(back.type).toBe('button')
    expect(back.getAttribute('aria-label')).toBe(t('backToLinks'))
    expect(back.textContent).toBe(t('back'))
    expect(back.querySelector('svg')).not.toBeNull()
    expect(heading.closest('section')?.querySelector('#link-url')).not.toBeNull()
    back.click()
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('combines preview and save in the third and final panel', () => {
    render()
    const panels = main.querySelectorAll('section.db-panel')
    expect(panels).toHaveLength(3)
    const preview = panels[2]!
    expect(preview.querySelector('h2')?.textContent).toBe(t('panelPreview'))
    expect(preview.querySelector('.mocks')).not.toBeNull()
    expect(preview.querySelector('#save-status')).not.toBeNull()
    expect(preview.querySelector('.steps')).not.toBeNull()
    expect(preview.querySelector<HTMLButtonElement>('#save-link')?.type).toBe('submit')
  })

  it('derives preset kind on each input without a kind radio group', () => {
    render()
    expect(main.querySelector('input[name="preset-kind"]')).toBeNull()
    input('preset-text', '👨‍💻')
    expect(state.presetKind).toBe('emoji')
    input('preset-text', 'é')
    expect(state.presetKind).toBe('letter')
    input('preset-text', '1️⃣')
    expect(state.presetKind).toBe('emoji')
    input('preset-text', '')
    expect(state.presetKind).toBe('letter')
  })

  it('derives kind when autofilling the host letter', () => {
    state.presetText = '🎉'
    state.presetKind = 'emoji'
    render()
    input('link-url', 'https://example.com')
    expect(state.presetText).toBe('E')
    expect(state.presetKind).toBe('letter')
  })

  it('shows the provider note under the address only for a match', () => {
    render()
    const note = main.querySelector<HTMLElement>('#provider-note')!
    expect(note.hidden).toBe(true)
    expect(note.classList.contains('db-note')).toBe(true)
    expect(note.parentElement?.querySelector('#link-url')).not.toBeNull()
    input('link-url', 'https://patreon.com/example')
    expect(note.hidden).toBe(false)
    expect(note.textContent).toContain('Patreon')
    input('link-url', 'https://example.com')
    expect(note.hidden).toBe(true)
    expect(main.querySelector('#green-note')).toBeNull()
    expect(main.textContent).not.toContain('Bluesky picks the green button from the address')
    expect(main.textContent).not.toContain('O Bluesky escolhe o botão verde pelo endereço')
  })

  it.each([
    { imageError: 'Image failed', expected: 'Image failed' },
    { imageLoading: true, expected: 'loadingImage' },
    { saving: true, expected: 'saving' },
  ] as const)('mirrors status in the head and preserves the callback: %j', ({ expected, ...values }) => {
    Object.assign(state, values)
    render()
    const message = expected === 'Image failed' ? expected : t(expected)
    expect(main.querySelector('.db-panel-status')?.textContent).toBe(message)
    expect(onStatus).toHaveBeenLastCalledWith(message)
    if (state.saving) {
      const back = main.querySelector<HTMLButtonElement>('#page-title button')!
      expect(back.disabled).toBe(true)
      back.click()
      expect(onBack).not.toHaveBeenCalled()
      expect(main.querySelector<HTMLButtonElement>('#save-link')?.disabled).toBe(true)
    }
  })
})
