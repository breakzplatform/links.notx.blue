import type { OAuthSession } from '@atproto/oauth-client-browser'
import { MAX_PROFILE_LINKS } from '../lib/rules'
import {
  ConcurrentEditError,
  deleteLink,
  InvalidLinkError,
  loadLinks,
  reorderLinks,
  restoreLink,
  type LinkView,
} from '../lib/profile-links'
import { XrpcError, type Xrpc } from '../lib/types'
import { subscribeLocale, t } from '../i18n'
import { createAuth, isCancelledSignIn, isInvalidScope, normalizeSignInInput, type Auth } from '../oauth'
import { friendlyError, invalidLinkText } from './errors'
import { createEditorState, releaseEditor, renderEditor, type EditorState } from './editor'
import { renderLanding } from './landing'
import { controlId, renderLinks, type ConfirmRequest } from './links'
import { fetchProfile, type PublicProfile } from './profile'
import type { Shell } from './shell'

type Mode = 'boot' | 'signed-out' | 'list' | 'editor'

export async function startApp(shell: Shell): Promise<void> {
  shell.setStatus(t('restoring'))
  shell.setBusy(true)

  let auth: Auth | null = null
  let authError = ''
  try {
    auth = await createAuth()
  } catch (error) {
    authError = friendlyError(error)
  }

  let mode: Mode = 'boot'
  let session: OAuthSession | undefined
  let xrpc: Xrpc | null = null
  let profile: PublicProfile | null = null
  let shown: LinkView[] = []
  let hidden: LinkView[] = []
  let confirm: ConfirmRequest = null
  let editor: EditorState | null = null
  let editing: LinkView | undefined
  let busy = false
  let status = ''
  let error = authError
  let signingOut = false
  let signInFlight = false
  let requestId = 0
  let pendingFocus: string | null = null
  let confirmFrom: string | null = null
  let previousMode: Mode | null = null
  let painting = false
  let repair: LinkView | null = null
  let refreshOnLeave = false

  function releaseCurrent(): void {
    if (!editor) return
    releaseEditor(editor)
    editor = null
    editing = undefined
  }

  function reportStatus(message: string): void {
    if (message === status) return
    status = message
    if (!painting) shell.setStatus(status)
  }

  function render(): void {
    painting = true
    const modeChanged = previousMode !== null && previousMode !== mode
    previousMode = mode
    shell.refresh()
    shell.setBusy(busy && mode !== 'editor')

    const active = document.activeElement
    const activeId = active instanceof HTMLElement && active.id && shell.main.contains(active) ? active.id : ''

    if (mode === 'boot') {
      shell.main.replaceChildren()
    } else if (mode === 'editor' && editor) {
      renderEditor(shell.main, {
        state: editor,
        shownCount: shown.length,
        ...(editing ? { link: editing } : {}),
        xrpc,
        onBack: closeEditor,
        onSaved: () => {
          const rkey = editing?.rkey ?? editor?.savedRkey
          refreshOnLeave = false
          releaseCurrent()
          mode = 'list'
          pendingFocus = rkey ? controlId('edit', rkey) : 'add-link'
          void reload(t('saved'))
        },
        onSaveFailed: () => {
          refreshOnLeave = true
        },
        onConflict: () => {
          void afterConflict()
        },
        onStatus: reportStatus,
      })
    } else if (mode === 'list' && session) {
      renderLinks(shell.main, {
        did: session.did,
        profile,
        shown,
        hidden,
        busy,
        error,
        repair: repair !== null,
        confirm,
        onSignOut: () => void signOut(),
        onAdd: () => {
          if (shown.length >= MAX_PROFILE_LINKS) return
          openEditor()
        },
        onEdit: link => openEditor(link),
        onMove: (link, toIndex) => {
          const from = shown.indexOf(link)
          pendingFocus = controlId(toIndex < from ? 'move-up' : 'move-down', link.rkey)
          void move(link, toIndex)
        },
        onAddBack: link => void addBack(link),
        onAsk: request => {
          if (request) {
            const link = [...shown, ...hidden].find(item => item.uri === request.uri)
            confirmFrom = link
              ? controlId(request.kind === 'remove' ? 'remove' : 'delete', link.rkey)
              : 'page-title'
            pendingFocus = 'confirm-cancel'
          } else {
            pendingFocus = confirmFrom ?? 'page-title'
            confirmFrom = null
          }
          confirm = request
          render()
        },
        onConfirm: () => void confirmPending(),
        onRepair: () => {
          if (!repair) return
          const link = repair
          repair = null
          openEditor(link)
        },
      })
    } else {
      renderLanding(shell.main, {
        busy,
        error,
        onSignIn: value => void signIn(value),
        onBsky: () => void signIn('https://bsky.social'),
      })
    }

    painting = false
    shell.setStatus(status)

    if (busy) {
      if (!pendingFocus && activeId) pendingFocus = activeId
      return
    }
    const remembered = pendingFocus || (modeChanged ? 'page-title' : activeId)
    pendingFocus = null
    if (remembered) focusNode(remembered)
  }

  function focusNode(id: string): void {
    const node = document.getElementById(id)
    if (node instanceof HTMLButtonElement && node.disabled) {
      const sibling = document.getElementById(moveSiblingId(id) ?? '')
      if (sibling instanceof HTMLButtonElement && !sibling.disabled) {
        sibling.focus()
        return
      }
      document.getElementById('page-title')?.focus()
      return
    }
    if (node instanceof HTMLElement) {
      node.focus()
      return
    }
    if (id.startsWith('edit-')) {
      const addBack = document.getElementById(`addback-${id.slice('edit-'.length)}`)
      if (addBack instanceof HTMLElement) {
        addBack.focus()
        return
      }
    }
    document.getElementById('page-title')?.focus()
  }

  function openEditor(link?: LinkView): void {
    releaseCurrent()
    editor = createEditorState(link)
    editing = link
    mode = 'editor'
    status = ''
    error = ''
    repair = null
    pendingFocus = 'link-url'
    render()
  }

  function closeEditor(): void {
    const rkey = editing?.rkey ?? editor?.savedRkey
    const backToList = Boolean(session)
    const shouldRefresh = refreshOnLeave && backToList
    releaseCurrent()
    mode = backToList ? 'list' : 'signed-out'
    status = ''
    pendingFocus = backToList ? (rkey ? controlId('edit', rkey) : 'add-link') : 'page-title'
    if (shouldRefresh && xrpc && session) {
      void reload()
      return
    }
    refreshOnLeave = false
    render()
  }

  async function reload(done?: string): Promise<boolean> {
    refreshOnLeave = false
    repair = null
    if (!xrpc || !session) return false
    const id = ++requestId
    busy = true
    error = ''
    status = t('loadingLinks')
    mode = 'list'
    render()
    try {
      const [loaded, nextProfile] = await Promise.all([
        loadLinks(xrpc),
        fetchProfile(session.did),
      ])
      if (id !== requestId) return false
      shown = loaded.shown
      hidden = loaded.hidden
      profile = nextProfile
      confirm = null
      busy = false
      status = done ?? ''
      render()
      return true
    } catch (err) {
      if (id !== requestId) return false
      busy = false
      status = ''
      error = friendlyError(err)
      render()
      return false
    }
  }

  async function afterConflict(): Promise<void> {
    releaseCurrent()
    const ok = await reload()
    if (!ok) return
    error = t('concurrent')
    status = ''
    render()
  }

  async function boot(): Promise<void> {
    if (!auth) {
      mode = 'signed-out'
      busy = false
      status = ''
      render()
      return
    }
    mode = 'boot'
    busy = true
    status = t('restoring')
    render()
    try {
      const restored = await auth.init()
      if (!restored) {
        mode = 'signed-out'
        busy = false
        status = ''
        render()
        return
      }
      session = restored
      xrpc = await auth.xrpcFor(restored)
      mode = 'list'
      await reload()
    } catch (err) {
      session = undefined
      xrpc = null
      mode = 'signed-out'
      busy = false
      status = ''
      error = friendlyError(err)
      render()
    }
  }

  async function signIn(raw: string): Promise<void> {
    const input = normalizeSignInInput(raw)
    if (!auth || busy || !input) return
    busy = true
    error = ''
    status = t('signingIn')
    signInFlight = true
    render()
    try {
      // Redirect mode navigates away and never resolves. A return through the
      // back-forward cache rejects later; pageshow decides whether that is a cancel.
      await auth.signIn(input)
    } catch (err) {
      // pageshow already reported a bfcache cancel and cleared the flag.
      if (!signInFlight) return
      signInFlight = false
      busy = false
      status = ''
      if (isCancelledSignIn(err)) {
        render()
        return
      }
      error = isInvalidScope(err) ? t('invalidScope') : friendlyError(err)
      render()
    }
  }

  async function signOut(): Promise<void> {
    if (!auth || !session || busy) return
    signingOut = true
    busy = true
    status = t('working')
    render()
    let signedOut = false
    try {
      await auth.signOut(session)
      signedOut = true
    } catch (err) {
      error = friendlyError(err)
    } finally {
      if (signedOut) {
        requestId += 1
        session = undefined
        xrpc = null
        profile = null
        shown = []
        hidden = []
        confirm = null
        repair = null
        refreshOnLeave = false
        error = ''
        releaseCurrent()
        mode = 'signed-out'
      }
      busy = false
      status = ''
      render()
      signingOut = false
    }
  }

  function sessionDeleted(): void {
    if (signingOut) return
    requestId += 1
    session = undefined
    xrpc = null
    profile = null
    shown = []
    hidden = []
    confirm = null
    repair = null
    refreshOnLeave = false
    busy = false
    status = ''
    error = t('sessionEnded')
    releaseCurrent()
    mode = 'signed-out'
    render()
  }

  async function move(link: LinkView, toIndex: number): Promise<void> {
    if (!xrpc || busy) return
    busy = true
    error = ''
    status = t('working')
    render()
    try {
      await reorderLinks(xrpc, link.uri, toIndex)
    } catch (err) {
      if (err instanceof ConcurrentEditError) {
        await afterConflict()
        return
      }
      busy = false
      status = ''
      error = friendlyError(err)
      render()
      return
    }
    await reload(t('reordered'))
  }

  async function addBack(link: LinkView): Promise<void> {
    if (!xrpc || busy || shown.length >= MAX_PROFILE_LINKS) return
    busy = true
    repair = null
    error = ''
    status = t('working')
    render()
    try {
      await restoreLink(xrpc, link.uri)
    } catch (err) {
      if (err instanceof ConcurrentEditError) {
        await afterConflict()
        return
      }
      busy = false
      status = ''
      if (err instanceof InvalidLinkError) {
        repair = link
        error = invalidLinkText(err)
        pendingFocus = 'repair-link'
      } else if (err instanceof Error && err.message === 'missing') {
        error = t('restoreMissing')
      } else {
        error = friendlyError(err)
      }
      render()
      return
    }
    await reload(t('addedBack'))
  }

  async function confirmPending(): Promise<void> {
    if (!xrpc || !confirm || busy) return
    const request = confirm
    const target = [...shown, ...hidden].find(item => item.uri === request.uri)
    busy = true
    error = ''
    status = t('working')
    render()
    try {
      await deleteLink(xrpc, request.uri, target?.cid)
    } catch (err) {
      if (err instanceof ConcurrentEditError) {
        await afterConflict()
        return
      }
      if (!(err instanceof XrpcError) || err.error !== 'RecordNotFound') {
        busy = false
        status = ''
        error = friendlyError(err)
        render()
        return
      }
    }
    confirm = null
    await reload(request.kind === 'delete' ? t('deleted') : t('removed'))
  }

  window.addEventListener('pageshow', event => {
    if (!event.persisted || !signInFlight) return
    signInFlight = false
    busy = false
    status = ''
    error = t('signInCancelled')
    render()
  })

  subscribeLocale(() => render())
  if (auth) auth.onDeleted(() => sessionDeleted())
  await boot()
}

function moveSiblingId(id: string): string | null {
  if (id.startsWith('move-up-')) return `move-down-${id.slice('move-up-'.length)}`
  if (id.startsWith('move-down-')) return `move-up-${id.slice('move-down-'.length)}`
  return null
}
