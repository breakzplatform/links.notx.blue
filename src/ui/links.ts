import { MAX_PROFILE_LINKS, formatLinkUrl, getLinkHost } from '../lib/rules'
import type { LinkView } from '../lib/profile-links'
import { t } from '../i18n'
import { el } from './dom'
import { renderFaq } from './faq'
import { renderPromo } from './landing'
import { icon } from './icons'
import type { PublicProfile } from './profile'

export type ConfirmRequest = { uri: string; kind: 'remove' | 'delete' } | null

type ControlKind = 'move-up' | 'move-down' | 'edit' | 'remove' | 'addback' | 'delete'

export function controlId(kind: ControlKind, rkey: string): string {
  return `${kind}-${rkey.replace(/[^A-Za-z0-9_-]/g, '')}`
}

export function renderLinks(
  main: HTMLElement,
  options: {
    did: string
    profile: PublicProfile | null
    shown: LinkView[]
    hidden: LinkView[]
    busy: boolean
    error: string
    repair: boolean
    status?: string
    confirm: ConfirmRequest
    onSignOut: () => void
    onAdd: () => void
    onEdit: (link: LinkView) => void
    onMove: (link: LinkView, toIndex: number) => void
    onAddBack: (link: LinkView) => void
    onAsk: (request: ConfirmRequest) => void
    onConfirm: () => void
    onRepair: () => void
  },
): void {
  const atLimit = options.shown.length >= MAX_PROFILE_LINKS
  const repair = options.repair
    ? el('button', { className: 'btn cast press', attrs: { type: 'button', id: 'repair-link' }, text: t('fixInEditor') })
    : null
  if (repair) repair.addEventListener('click', () => options.onRepair())
  const error = el('div', { className: 'alert', attrs: { role: 'alert' } },
    el('p', { text: options.error }),
    repair,
  )
  error.hidden = options.error.length === 0

  const add = el('button', { className: 'btn primary cast press', attrs: { type: 'button', id: 'add-link' }, text: t('addLink') })
  add.disabled = options.busy || atLimit
  add.addEventListener('click', () => options.onAdd())
  const limit = el('p', { className: 'hint', attrs: { id: 'link-limit' }, text: t('limitReached') })
  limit.hidden = !atLimit
  if (atLimit) add.setAttribute('aria-describedby', 'link-limit')

  const shown = options.shown.length === 0
    ? options.busy ? null : el('p', { className: 'empty', text: t('linksEmpty') })
    : el('ol', { className: 'links' }, ...options.shown.map((link, index) => row(link, {
      busy: options.busy,
      confirm: options.confirm,
      index,
      count: options.shown.length,
      mode: 'shown',
      onEdit: () => options.onEdit(link),
      onMove: (toIndex) => options.onMove(link, toIndex),
      onAsk: options.onAsk,
      onConfirm: options.onConfirm,
    })))

  const hidden = options.hidden.length === 0
    ? null
    : el('section', { className: 'panel cast', attrs: { 'aria-labelledby': 'hidden-title' } },
      el('h2', { className: 'panel-h', attrs: { id: 'hidden-title' }, text: t('hiddenHeading') }),
      el('div', { className: 'panel-b stack' },
        el('p', { className: 'hint', text: t('hiddenLead') }),
        el('ul', { className: 'links' }, ...options.hidden.map(link => row(link, {
          busy: options.busy,
          confirm: options.confirm,
          index: 0,
          count: 1,
          mode: 'hidden',
          addDisabled: atLimit || options.busy,
          onAddBack: () => options.onAddBack(link),
          onAsk: options.onAsk,
          onConfirm: options.onConfirm,
        }))),
      ),
    )

  main.replaceChildren(
    el('section', { className: 'stack' },
      error,
      el('section', { className: 'panel cast', attrs: { 'aria-labelledby': 'page-title' } },
        el('h1', { className: 'panel-h split', attrs: { id: 'page-title', tabindex: '-1' } },
          el('span', { text: t('panelLinks') }),
          el('span', { className: 'db-panel-status', text: options.status || t('linksCount', { count: options.shown.length, max: MAX_PROFILE_LINKS }) }),
        ),
        el('div', { className: 'panel-b stack' },
          profileBlock(options),
          shown,
          el('div', { className: 'actions' }, add),
          limit,
        ),
      ),
      hidden,
      renderFaq(),
      renderPromo(),
    ),
  )
}

function profileBlock(options: { did: string; profile: PublicProfile | null; busy: boolean; onSignOut: () => void }): HTMLElement {
  const name = options.profile?.displayName || options.profile?.handle || options.did
  const signOut = el('button', { className: 'btn cast press', attrs: { type: 'button' }, text: t('signOut') })
  signOut.disabled = options.busy
  signOut.addEventListener('click', () => options.onSignOut())
  return el('div', { className: 'profile' },
    options.profile?.avatar
      ? el('img', { className: 'avatar', attrs: { src: options.profile.avatar, alt: '', width: 40, height: 40 } })
      : el('span', { className: 'avatar placeholder', attrs: { 'aria-hidden': 'true' } }),
    el('div', {},
      el('p', { className: 'name', text: name }),
      options.profile?.handle ? el('p', { className: 'handle', text: `@${options.profile.handle}` }) : null,
    ),
    signOut,
  )
}

function row(
  link: LinkView,
  options: {
    busy: boolean
    confirm: ConfirmRequest
    index: number
    count: number
    mode: 'shown' | 'hidden'
    addDisabled?: boolean
    onEdit?: () => void
    onMove?: (toIndex: number) => void
    onAddBack?: () => void
    onAsk: (request: ConfirmRequest) => void
    onConfirm: () => void
  },
): HTMLElement {
  const view = linkView(link)
  const confirming = options.confirm?.uri === link.uri
  const actions = el('div', { className: 'actions' })

  if (options.mode === 'shown' && options.onMove && options.onEdit) {
    const upLabel = t('moveUp', { label: view.label })
    const up = el('button', { className: 'btn icon-btn cast press', attrs: { type: 'button', id: controlId('move-up', link.rkey), 'aria-label': upLabel, title: upLabel } }, icon('arrow-up', 18))
    up.disabled = options.busy || options.index === 0
    up.addEventListener('click', () => options.onMove?.(options.index - 1))
    const downLabel = t('moveDown', { label: view.label })
    const down = el('button', { className: 'btn icon-btn cast press', attrs: { type: 'button', id: controlId('move-down', link.rkey), 'aria-label': downLabel, title: downLabel } }, icon('arrow-down', 18))
    down.disabled = options.busy || options.index === options.count - 1
    down.addEventListener('click', () => options.onMove?.(options.index + 1))
    const edit = el('button', { className: 'btn cast press', attrs: { type: 'button', id: controlId('edit', link.rkey) }, text: t('editShort') })
    edit.setAttribute('aria-label', t('edit', { label: view.label }))
    edit.disabled = options.busy
    edit.addEventListener('click', () => options.onEdit?.())
    const remove = el('button', { className: 'btn cast press caution', attrs: { type: 'button', id: controlId('remove', link.rkey) }, text: t('removeShort') })
    remove.setAttribute('aria-label', t('remove', { label: view.label }))
    remove.disabled = options.busy
    remove.addEventListener('click', () => options.onAsk({ uri: link.uri, kind: 'remove' }))
    actions.append(up, down, edit, remove)
  } else if (options.onAddBack) {
    const addBack = el('button', { className: 'btn cast press', attrs: { type: 'button', id: controlId('addback', link.rkey) }, text: t('addBackShort') })
    addBack.setAttribute('aria-label', t('addBack', { label: view.label }))
    addBack.disabled = options.addDisabled === true
    addBack.addEventListener('click', () => options.onAddBack?.())
    const del = el('button', { className: 'btn cast press caution', attrs: { type: 'button', id: controlId('delete', link.rkey) }, text: t('deleteShort') })
    del.setAttribute('aria-label', t('deleteRecord', { label: view.label }))
    del.disabled = options.busy
    del.addEventListener('click', () => options.onAsk({ uri: link.uri, kind: 'delete' }))
    actions.append(addBack, del)
  }

  const confirm = confirming && options.confirm
    ? confirmBox(view.label, options.confirm.kind, options.busy, options.onConfirm, () => options.onAsk(null))
    : null

  return el('li', { className: options.mode === 'shown' ? 'link ranked' : 'link' },
    options.mode === 'shown'
      ? el('span', { className: 'rank', attrs: { 'aria-hidden': 'true' }, text: String(options.index + 1) })
      : null,
    link.iconUrl
      ? el('img', { className: 'link-icon', attrs: { src: link.iconUrl, alt: '', width: 40, height: 40 } })
      : el('span', { className: 'link-icon placeholder', attrs: { 'aria-hidden': 'true' } }),
    el('div', { className: 'link-copy' },
      el('p', { className: 'link-title', text: view.label }),
      view.url,
      view.note,
    ),
    actions,
    confirm,
  )
}

function confirmBox(label: string, kind: 'remove' | 'delete', busy: boolean, onConfirm: () => void, onCancel: () => void): HTMLElement {
  const question = kind === 'remove' ? t('confirmRemove', { label }) : t('confirmDelete', { label })
  const yes = el('button', { className: 'btn danger cast press', attrs: { type: 'button', id: 'confirm-action' }, text: t('confirmAction') })
  yes.disabled = busy
  yes.addEventListener('click', onConfirm)
  const no = el('button', { className: 'btn cast press', attrs: { type: 'button', id: 'confirm-cancel' }, text: t('cancel') })
  no.disabled = busy
  no.addEventListener('click', onCancel)
  return el('div', { className: 'confirm cast', attrs: { role: 'group', 'aria-labelledby': 'confirm-question' } },
    el('p', { attrs: { id: 'confirm-question' }, text: question }),
    el('div', { className: 'actions' }, yes, no),
  )
}

function linkView(link: LinkView): { label: string; url: HTMLElement; note: HTMLElement | null } {
  const raw = link.missing ? undefined : link.record
  const urlValue: unknown = raw?.url
  const titleValue: unknown = raw?.title
  if (
    link.missing
    || !raw
    || typeof urlValue !== 'string'
    || urlValue.length === 0
    || (titleValue !== undefined && typeof titleValue !== 'string')
  ) {
    return {
      label: t('missingLabel'),
      url: el('p', { className: 'url', text: link.uri }),
      note: el('p', { className: 'hint', text: t('missing') }),
    }
  }
  const href = httpsHref(urlValue)
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  return {
    label: title || getLinkHost(urlValue) || t('missingLabel'),
    url: href
      ? el('a', { className: 'url', attrs: { href, target: '_blank', rel: 'noopener noreferrer' }, text: formatLinkUrl(urlValue) })
      : el('p', { className: 'url', text: urlValue }),
    note: link.stale ? el('p', { className: 'hint', text: t('stale') }) : null,
  }
}

function httpsHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}
