import './editor.css'
import type { Crop } from '../lib/image/crop'
import { initialCrop, panCrop, zoomCrop } from '../lib/image/crop'
import { encodeIcon } from '../lib/image/encode'
import { PRESET_COLORS, detectPresetKind, drawPreset, firstGrapheme, type Preset } from '../lib/image/preset'
import { IMAGE_SOURCE_TYPES, faviconUrl, fetchImageFromUrl, fileToBlob } from '../lib/image/source'
import { loadTwemoji } from '../lib/image/twemoji'
import {
  ConcurrentEditError,
  InvalidLinkError,
  PartialSaveError,
  saveLink,
  type LinkView,
} from '../lib/profile-links'
import {
  TITLE_MAX_GRAPHEMES,
  getLinkHost,
  graphemeLength,
  validateIcon,
  validateLink,
  validateTitle,
} from '../lib/rules'
import type { Xrpc } from '../lib/types'
import {
  getLocale,
  iconIssueMessage,
  linkIssueMessage,
  t,
  titleIssueMessage,
  type MessageKey,
} from '../i18n'
import { el, setText } from './dom'
import { blueskyIconBadge } from './badge'
import { icon } from './icons'
import { friendlyError, invalidLinkText, partialSaveText } from './errors'
import { formatBytes, mimeName } from './format'

export type IconTab = 'upload' | 'url' | 'favicon' | 'preset' | 'keep' | 'none'
type StepName = 'upload' | 'link' | 'profile'
type StepMark = 'pending' | 'active' | 'done' | 'skipped' | 'error'

const SWATCH_NAMES: Record<string, MessageKey> = {
  '#32BCAD': 'colorPix',
  '#1185FE': 'colorBlue',
  '#000000': 'colorBlack',
  '#9333EA': 'colorPurple',
  '#DC2626': 'colorRed',
  '#EA580C': 'colorOrange',
  '#CA8A04': 'colorGold',
  '#15803D': 'colorGreen',
  '#DB2777': 'colorPink',
}

const STEP_KEYS: Record<StepMark, MessageKey> = {
  pending: 'stepPending',
  active: 'stepActive',
  done: 'stepDone',
  skipped: 'stepSkipped',
  error: 'stepError',
}

export type EditorState = {
  url: string
  title: string
  tab: IconTab
  allowKeep: boolean
  keepMime: string | null
  keepBytes: number | null
  keepIconUrl: string | null
  presetText: string
  presetKind: 'letter' | 'emoji'
  presetColor: string
  presetTouched: boolean
  imageUrlField: string
  image: HTMLImageElement | null
  imageUrl: string | null
  imageWidth: number
  imageHeight: number
  crop: Crop | null
  urlTouched: boolean
  imageLoading: boolean
  imageError: string
  encodedUrl: string | null
  encoded: { blob: Blob; size: number; mime: string } | null
  encoding: boolean
  encodeError: string
  saving: boolean
  saveError: string
  savedRkey: string | null
  stepsVisible: boolean
  steps: Record<StepName, StepMark>
  emojiImage: HTMLImageElement | null
  emojiKey: string
}

let sync = () => {}
let cropObserver: ResizeObserver | null = null
let encodeToken = 0
let loadToken = 0
let encodeTimer = 0
let faviconTimer = 0
let editorGeneration = 0

export function createEditorState(link?: LinkView): EditorState {
  const record = link && !link.missing ? link.record : undefined
  const icon = record?.icon
  return {
    url: record?.url ?? '',
    title: record?.title ?? '',
    tab: icon ? 'keep' : link && !link.missing ? 'none' : 'preset',
    allowKeep: Boolean(icon),
    keepMime: icon?.mimeType ?? null,
    keepBytes: icon?.size ?? null,
    keepIconUrl: link && !link.missing ? link.iconUrl ?? null : null,
    presetText: 'A',
    presetKind: 'letter',
    presetColor: '#32BCAD',
    presetTouched: false,
    imageUrlField: '',
    image: null,
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    crop: null,
    urlTouched: false,
    imageLoading: false,
    imageError: '',
    encodedUrl: null,
    encoded: null,
    encoding: false,
    encodeError: '',
    saving: false,
    saveError: '',
    savedRkey: null,
    stepsVisible: false,
    steps: { upload: 'pending', link: 'pending', profile: 'pending' },
    emojiImage: null,
    emojiKey: '',
  }
}

export function releaseEditor(state: EditorState): void {
  editorGeneration += 1
  window.clearTimeout(encodeTimer)
  window.clearTimeout(faviconTimer)
  encodeToken += 1
  loadToken += 1
  sync = () => {}
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)
  if (state.encodedUrl) URL.revokeObjectURL(state.encodedUrl)
  state.imageUrl = null
  state.encodedUrl = null
  state.image = null
  cropObserver?.disconnect()
}

export function renderEditor(
  main: HTMLElement,
  options: {
    state: EditorState
    shownCount: number
    link?: LinkView
    xrpc: Xrpc | null
    onBack: () => void
    onSaved: () => void
    onSaveFailed: () => void
    onConflict: () => void
    onStatus: (message: string) => void
  },
): void {
  const state = options.state
  state.presetKind = detectPresetKind(state.presetText)
  const editing = Boolean(options.link)
  const generation = editorGeneration
  window.clearTimeout(encodeTimer)
  window.clearTimeout(faviconTimer)
  sync = () => {}

  const urlInput = el('input', {
    attrs: {
      id: 'link-url',
      type: 'text',
      autocapitalize: 'off',
      spellcheck: 'false',
      autocomplete: 'off',
    },
  })
  urlInput.value = state.url
  const urlIssues = el('ul', { className: 'issues err', attrs: { id: 'url-issues' } })
  const providerNote = el('p', { className: 'db-note', attrs: { id: 'provider-note' } })
  const providerBadge = blueskyIconBadge()
  providerBadge.id = 'provider-badge'
  providerBadge.hidden = true

  const titleInput = el('input', {
    attrs: { id: 'link-title', type: 'text', autocomplete: 'off' },
  })
  titleInput.value = state.title
  const titleCount = el('span', { className: 'counter', attrs: { id: 'title-count' } })
  const titleIssues = el('ul', { className: 'issues err', attrs: { id: 'title-issues' } })

  const tabs: IconTab[] = ['upload', 'url', 'favicon', 'preset']
  if (state.allowKeep) tabs.push('keep')
  tabs.push('none')
  if (!tabs.includes(state.tab)) state.tab = 'preset'

  const tabButtons = new Map<IconTab, HTMLButtonElement>()
  const panels = new Map<IconTab, HTMLElement>()
  const tablist = el('div', { className: 'tabs cast', attrs: { role: 'tablist', 'aria-labelledby': 'icon-source-title' } })

  const fileInput = el('input', {
    attrs: { id: 'file-input', type: 'file', accept: IMAGE_SOURCE_TYPES.join(',') },
  })
  const drop = el('div', { className: 'drop cast-flat' },
    el('label', { className: 'label', attrs: { for: 'file-input' }, text: t('fileLabel') }),
    el('p', { className: 'hint', text: t('fileHint') }),
    fileInput,
    el('p', { className: 'hint', attrs: { id: 'file-loaded' } }),
  )

  const imageUrlInput = el('input', {
    attrs: { id: 'image-url', type: 'url', inputmode: 'url', autocomplete: 'off', spellcheck: 'false' },
  })
  imageUrlInput.value = state.imageUrlField
  const loadUrlButton = el('button', { className: 'btn cast press', attrs: { type: 'button' }, text: t('loadImage') })

  const faviconButton = el('button', { className: 'btn cast press', attrs: { type: 'button' }, text: t('loadFavicon') })

  const presetInput = el('input', {
    attrs: { id: 'preset-text', type: 'text', autocomplete: 'off', maxlength: '16' },
  })
  presetInput.value = state.presetText
  const colorInput = el('input', { attrs: { id: 'preset-color', type: 'color' } })
  colorInput.value = normalizeColor(state.presetColor)
  const swatchRadios: HTMLInputElement[] = []
  const swatches = el('div', { className: 'swatches' })
  for (const hex of PRESET_COLORS) {
    const radio = el('input', { attrs: { type: 'radio', name: 'preset-color', value: hex } })
    swatchRadios.push(radio)
    const nameKey = SWATCH_NAMES[hex.toUpperCase()]
    // Set through CSSOM: the CSP (style-src 'self') blocks style attributes.
    const chip = el('span', { className: 'chip' })
    chip.style.background = hex
    swatches.append(el('label', { className: 'swatch' },
      radio,
      chip,
      el('span', { className: 'sr', text: nameKey ? t(nameKey) : hex }),
    ))
  }

  const cropImg = el('img', { attrs: { alt: '' } })
  const cropStage = el('div', {
    className: 'crop-stage',
    attrs: { id: 'crop-stage', tabindex: '0', role: 'group', 'aria-describedby': 'crop-help' },
  }, cropImg)
  const zoom = el('input', {
    attrs: { id: 'crop-zoom', type: 'range', min: '1', max: '8', step: '0.05' },
  })
  const cropBlock = el('div', { className: 'stack', attrs: { id: 'crop-block' } },
    el('p', { className: 'label', attrs: { id: 'crop-label' }, text: t('cropLabel') }),
    cropStage,
    el('p', { className: 'hint', attrs: { id: 'crop-help' }, text: t('cropHelp') }),
    el('label', { className: 'label', attrs: { for: 'crop-zoom' }, text: t('zoom') }),
    zoom,
  )
  cropStage.setAttribute('aria-labelledby', 'crop-label')

  const imageStatus = el('p', { attrs: { id: 'image-status' } })
  imageStatus.hidden = true

  const mocks = el('div', { className: 'mocks' })
  const zoomPreview = el('img', { className: 'zoom-preview', attrs: { alt: '', width: 64, height: 64 } })
  const previewMeta = el('p', { className: 'meta', attrs: { id: 'preview-meta' } })
  const previewEmpty = el('p', { className: 'zoom-empty', text: t('noIcon') })

  const stepItems = {} as Record<StepName, HTMLElement>
  const stepStates = {} as Record<StepName, HTMLElement>
  const steps = el('ol', { className: 'steps', attrs: { 'aria-label': t('stepsLabel') } })
  for (const name of ['upload', 'link', 'profile'] as const) {
    const mark = el('span', { className: 'step-state' })
    const item = el('li', {}, el('span', { text: t(name === 'upload' ? 'stepUpload' : name === 'link' ? 'stepLink' : 'stepProfile') }), mark)
    stepItems[name] = item
    stepStates[name] = mark
    steps.append(item)
  }
  const saveStatus = el('p', { attrs: { id: 'save-status' } })
  const saveError = el('p', { className: 'alert', attrs: { role: 'alert' } })
  const saveButton = el('button', { className: 'btn primary lg cast press', attrs: { type: 'submit', id: 'save-link' } })

  const panelStatus = el('span', { className: 'db-panel-status' })
  function setStatus(message: string): void {
    setText(panelStatus, message)
    options.onStatus(message)
  }
  const back = el('button', {
    className: 'editor-back',
    attrs: { type: 'button', 'aria-label': t('backToLinks') },
  }, icon('arrow-left', 14), t('back'))
  back.addEventListener('click', () => {
    if (!state.saving) options.onBack()
  })

  function addTab(tab: IconTab, label: string, panel: HTMLElement): void {
    const button = el('button', {
      className: 'tab',
      attrs: {
        type: 'button',
        role: 'tab',
        id: `tab-${tab}`,
        'aria-controls': `panel-${tab}`,
      },
      text: label,
    })
    button.addEventListener('click', () => selectTab(tab))
    tabButtons.set(tab, button)
    tablist.append(button)
    panel.id = `panel-${tab}`
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', `tab-${tab}`)
    panel.hidden = true
    panels.set(tab, panel)
  }

  addTab('upload', t('sourceUpload'), drop)
  addTab('url', t('sourceUrl'), el('div', { className: 'stack' },
    el('div', { className: 'field-block' },
      el('label', { className: 'label', attrs: { for: 'image-url' }, text: t('imageUrlLabel') }),
      el('div', { className: 'input-row' },
        el('span', { className: 'field cast' }, imageUrlInput),
        loadUrlButton,
      ),
    ),
  ))
  addTab('favicon', t('sourceFavicon'), el('div', { className: 'stack' },
    el('p', { className: 'hint', text: t('faviconHint') }),
    el('div', { className: 'actions' }, faviconButton),
  ))
  addTab('preset', t('sourcePreset'), el('div', { className: 'stack' },
    el('div', { className: 'field-block' },
      el('label', { className: 'label', attrs: { for: 'preset-text' }, text: t('presetTextLabel') }),
      el('span', { className: 'field cast' }, presetInput),
      el('p', { className: 'hint', text: t('presetTextHint') }),
    ),
    el('fieldset', {},
      el('legend', { text: t('colorLegend') }),
      swatches,
      el('label', { className: 'color-field', attrs: { for: 'preset-color' } }, t('colorCustom'), colorInput),
    ),
  ))
  if (state.allowKeep) {
    addTab('keep', t('sourceKeep'), el('div', { className: 'stack' },
      state.keepIconUrl
        ? el('img', { className: 'link-icon', attrs: { src: state.keepIconUrl, alt: t('currentIcon'), width: 40, height: 40 } })
        : el('p', { text: t('currentIcon') }),
    ))
  }
  addTab('none', t('sourceNone'), el('p', { text: t('noIcon') }))

  tablist.addEventListener('keydown', event => {
    const order = tabs
    const index = order.indexOf(state.tab)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % order.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + order.length) % order.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = order.length - 1
    else return
    event.preventDefault()
    const tab = order[next]
    if (!tab) return
    selectTab(tab)
    tabButtons.get(tab)?.focus()
  })

  const form = el('form', { className: 'stack' },
    el('section', { className: 'db-panel cast', attrs: { 'aria-labelledby': 'editor-title' } },
      el('h1', {
        className: 'db-panel-head editor-head',
        attrs: { id: 'page-title', tabindex: '-1' },
      }, back, el('span', { className: 'editor-title', attrs: { id: 'editor-title' }, text: editing ? t('editorEdit') : t('editorNew') }), panelStatus),
      el('div', { className: 'panel-b stack' },
        el('div', { className: 'field-block' },
          el('label', { className: 'label', attrs: { for: 'link-url' }, text: t('urlLabel') }),
          el('span', { className: 'field cast' }, urlInput),
          urlIssues,
          providerBadge,
          providerNote,
        ),
        el('div', { className: 'field-block' },
          el('label', { className: 'label', attrs: { for: 'link-title' } }, t('titleLabel'), ' ', titleCount),
          el('span', { className: 'field cast' }, titleInput),
          el('p', { className: 'hint', attrs: { id: 'title-hint' }, text: t('titleHint') }),
          titleIssues,
        ),
      ),
    ),
    panel('panelIcon', 'panel-icon',
      el('div', { className: 'stack icon-source' },
        el('p', { className: 'label icon-source-title', attrs: { id: 'icon-source-title' }, text: t('iconTypeTitle') }),
        tablist,
        ...panels.values(),
        imageStatus,
        cropBlock,
      ),
    ),
    panel('panelPreview', 'panel-preview',
      el('p', { className: 'hint', text: t('previewNote') }),
      mocks,
      el('figure', { className: 'zoom-figure' },
        el('figcaption', { text: t('previewZoom') }),
        zoomPreview,
        previewEmpty,
      ),
      previewMeta,
      saveStatus,
      steps,
      saveError,
      el('div', { className: 'actions' }, saveButton),
    ),
  )

  urlInput.setAttribute('aria-describedby', 'url-issues')
  titleInput.setAttribute('aria-describedby', 'title-hint title-count title-issues')

  main.replaceChildren(form)

  urlInput.addEventListener('input', () => {
    state.urlTouched = true
    state.url = urlInput.value
    if (!state.presetTouched) {
      const letter = hostLetter(state.url)
      if (letter) {
        state.presetText = letter
        state.presetKind = detectPresetKind(letter)
      }
    }
    sync()
    if (state.tab === 'favicon') scheduleFavicon()
    if (state.tab === 'preset') scheduleEncode()
  })
  urlInput.addEventListener('blur', () => {
    if (state.urlTouched || !urlInput.isConnected) return
    state.urlTouched = true
    sync()
  })
  titleInput.addEventListener('input', () => {
    state.title = titleInput.value
    sync()
  })
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) void loadBlob(async () => file)
  })
  drop.addEventListener('dragover', event => {
    event.preventDefault()
    drop.classList.add('drag')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'))
  drop.addEventListener('drop', event => {
    event.preventDefault()
    drop.classList.remove('drag')
    const file = event.dataTransfer?.files[0]
    if (file) void loadBlob(async () => file)
  })
  loadUrlButton.addEventListener('click', () => {
    state.imageUrlField = imageUrlInput.value.trim()
    void loadBlob(() => fetchImageFromUrl(state.imageUrlField))
  })
  imageUrlInput.addEventListener('input', () => {
    state.imageUrlField = imageUrlInput.value
  })
  imageUrlInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    state.imageUrlField = imageUrlInput.value.trim()
    void loadBlob(() => fetchImageFromUrl(state.imageUrlField))
  })
  faviconButton.addEventListener('click', () => maybeLoadFavicon())
  presetInput.addEventListener('input', () => {
    state.presetText = presetInput.value
    state.presetKind = detectPresetKind(state.presetText)
    state.presetTouched = true
    sync()
    scheduleEncode()
  })
  for (const radio of swatchRadios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return
      state.presetColor = radio.value
      colorInput.value = normalizeColor(radio.value)
      scheduleEncode()
    })
  }
  colorInput.addEventListener('input', () => {
    state.presetColor = colorInput.value
    sync()
    scheduleEncode()
  })
  zoom.addEventListener('input', () => {
    if (!state.crop || state.imageWidth < 1) return
    const maxSize = Math.min(state.imageWidth, state.imageHeight)
    const factor = Number(zoom.value)
    if (!Number.isFinite(factor) || factor <= 0) return
    const target = Math.max(1, maxSize / factor)
    const centerX = state.crop.x + state.crop.size / 2
    const centerY = state.crop.y + state.crop.size / 2
    state.crop = zoomCrop(state.crop, state.crop.size / target, centerX, centerY, state.imageWidth, state.imageHeight)
    placeCrop()
    scheduleEncode()
  })
  cropStage.addEventListener('pointerdown', event => {
    cropStage.setPointerCapture(event.pointerId)
    cropStage.dataset.dragging = 'true'
    cropStage.dataset.lastX = String(event.clientX)
    cropStage.dataset.lastY = String(event.clientY)
  })
  cropStage.addEventListener('pointermove', event => {
    if (cropStage.dataset.dragging !== 'true' || !state.crop) return
    const lastX = Number(cropStage.dataset.lastX ?? event.clientX)
    const lastY = Number(cropStage.dataset.lastY ?? event.clientY)
    const view = cropStage.clientWidth || 1
    const scale = view / state.crop.size
    state.crop = panCrop(
      state.crop,
      -(event.clientX - lastX) / scale,
      -(event.clientY - lastY) / scale,
      state.imageWidth,
      state.imageHeight,
    )
    cropStage.dataset.lastX = String(event.clientX)
    cropStage.dataset.lastY = String(event.clientY)
    placeCrop()
    scheduleEncode()
  })
  const endDrag = () => {
    cropStage.dataset.dragging = 'false'
  }
  cropStage.addEventListener('pointerup', endDrag)
  cropStage.addEventListener('pointercancel', endDrag)
  cropStage.addEventListener('keydown', event => {
    if (!state.crop) return
    const step = state.crop.size * (event.shiftKey ? 0.12 : 0.04)
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step
    else return
    event.preventDefault()
    state.crop = panCrop(state.crop, dx, dy, state.imageWidth, state.imageHeight)
    placeCrop()
    scheduleEncode()
  })

  cropObserver?.disconnect()
  cropObserver = new ResizeObserver(() => placeCrop())
  cropObserver.observe(cropStage)

  form.addEventListener('submit', event => {
    event.preventDefault()
    void save()
  })

  function scheduleEncode(): void {
    window.clearTimeout(encodeTimer)
    encodeTimer = window.setTimeout(() => void encodeNow(), 160)
  }
  function scheduleFavicon(): void {
    window.clearTimeout(faviconTimer)
    faviconTimer = window.setTimeout(() => maybeLoadFavicon(), 400)
  }

  function selectTab(tab: IconTab): void {
    if (state.tab !== tab) {
      state.tab = tab
      state.encodeError = ''
      state.imageError = ''
      clearEncoded()
    }
    sync()
    if (tab === 'favicon') maybeLoadFavicon()
    else if (tab === 'preset' || (bitmapTab(tab) && state.image)) scheduleEncode()
  }

  function placeCrop(): void {
    if (!state.image || !state.crop || !state.imageUrl) return
    if (cropImg.getAttribute('src') !== state.imageUrl) cropImg.src = state.imageUrl
    const view = cropStage.clientWidth || 1
    const scale = view / state.crop.size
    cropImg.style.width = `${state.imageWidth * scale}px`
    cropImg.style.height = `${state.imageHeight * scale}px`
    cropImg.style.left = `${-state.crop.x * scale}px`
    cropImg.style.top = `${-state.crop.y * scale}px`
  }

  function validation() {
    return validateLink(state.url, { existingCount: options.shownCount, editing })
  }

  function maybeLoadFavicon(): void {
    const checked = validation()
    if (!checked.url) {
      state.imageError = t('faviconNeedUrl')
      sync()
      return
    }
    let iconUrl = ''
    try {
      iconUrl = faviconUrl(checked.url)
    } catch {
      state.imageError = t('faviconNeedUrl')
      sync()
      return
    }
    void loadBlob(() => fetchImageFromUrl(iconUrl))
  }

  async function loadBlob(task: () => Promise<Blob>): Promise<void> {
    if (generation !== editorGeneration) return
    const token = ++loadToken
    try {
      state.imageLoading = true
      state.imageError = ''
      sync()
      const blob = fileToBlob(await task())
      if (generation !== editorGeneration || token !== loadToken) return
      const url = URL.createObjectURL(blob)
      const image = await decodeImage(url)
      if (generation !== editorGeneration || token !== loadToken) {
        URL.revokeObjectURL(url)
        return
      }
      if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)
      state.imageUrl = url
      state.image = image
      state.imageWidth = image.naturalWidth
      state.imageHeight = image.naturalHeight
      state.crop = initialCrop(image.naturalWidth, image.naturalHeight)
      state.imageLoading = false
      sync()
      void encodeNow()
    } catch (error) {
      if (generation !== editorGeneration || token !== loadToken) return
      state.imageLoading = false
      state.imageError = imageErrorText(error)
      paintImageStatus()
      setStatus(state.imageError)
      try { sync() } catch { /* the alert next to the icon source is already visible */ }
    }
  }

  async function encodeNow(): Promise<void> {
    if (generation !== editorGeneration) return
    const token = ++encodeToken
    const tab = state.tab
    if (!producesIcon(tab)) {
      state.encoding = false
      return
    }
    if (tab !== 'preset' && (!state.image || !state.crop)) {
      state.encoding = false
      state.encodeError = ''
      sync()
      return
    }
    state.encoding = true
    state.encodeError = ''
    sync()
    try {
      let emoji: HTMLImageElement | undefined
      const preset = currentPresetFrom(state)
      if (tab === 'preset' && preset.kind === 'emoji') {
        const grapheme = firstGrapheme(preset.text) || '?'
        if (state.emojiKey !== grapheme) {
          try {
            const loaded = await loadTwemoji(grapheme)
            if (generation !== editorGeneration || token !== encodeToken) return
            state.emojiImage = loaded
          } catch {
            if (generation !== editorGeneration || token !== encodeToken) return
            state.emojiImage = null
          }
          state.emojiKey = grapheme
        }
        emoji = state.emojiImage ?? undefined
      }
      const image = state.image
      const crop = state.crop
      const result = await encodeIcon(size => draw(size, tab, preset, emoji, image, crop))
      if (generation !== editorGeneration || token !== encodeToken) return
      const issues = validateIcon(result.blob)
      if (issues.length > 0) {
        clearEncoded()
        state.encodeError = issues.map(iconIssueMessage).join(' ')
      } else {
        if (state.encodedUrl) URL.revokeObjectURL(state.encodedUrl)
        state.encoded = result
        state.encodedUrl = URL.createObjectURL(result.blob)
        state.encodeError = ''
      }
    } catch (error) {
      if (generation !== editorGeneration || token !== encodeToken) return
      clearEncoded()
      state.encodeError = friendlyError(error)
    } finally {
      if (generation === editorGeneration && token === encodeToken) {
        state.encoding = false
        sync()
      }
    }
  }

  async function save(): Promise<void> {
    if (!options.xrpc || state.saving) return
    state.urlTouched = true
    const checked = validation()
    const title = validateTitle(state.title)
    sync()
    if (checked.issues.length > 0 || title.issues.length > 0 || !checked.url) return
    if (producesIcon(state.tab)) {
      await encodeNow()
      if (!state.encoded) {
        if (!state.encodeError) state.encodeError = t('chooseImage')
        sync()
        return
      }
    }
    const icon = state.tab === 'none' ? null : producesIcon(state.tab) ? state.encoded?.blob : undefined
    const willUpload = icon instanceof Blob
    state.saving = true
    state.saveError = ''
    state.stepsVisible = true
    state.steps = {
      upload: willUpload ? 'pending' : 'skipped',
      link: 'pending',
      profile: 'pending',
    }
    sync()
    const rkey = state.savedRkey ?? options.link?.rkey
    try {
      await saveLink(options.xrpc, {
        ...(rkey ? { rkey } : {}),
        url: checked.url,
        ...(title.value ? { title: title.value } : { title: '' }),
        ...(icon !== undefined ? { icon } : {}),
        onProgress: (step, phase) => {
          if (generation !== editorGeneration) return
          state.steps[step] = phase === 'start' ? 'active' : 'done'
          sync()
        },
      })
      if (generation !== editorGeneration) return
      for (const name of ['upload', 'link', 'profile'] as const) {
        const mark = state.steps[name]
        if (mark === 'pending' || mark === 'active') state.steps[name] = 'done'
      }
      sync()
      options.onSaved()
    } catch (error) {
      if (generation !== editorGeneration) return
      options.onSaveFailed()
      state.saving = false
      if (error instanceof ConcurrentEditError) {
        options.onConflict()
        return
      }
      const names = ['upload', 'link', 'profile'] as const
      const active = names.find(name => state.steps[name] === 'active')
      if (active) state.steps[active] = 'error'
      else if (names.some(name => state.steps[name] === 'done')) {
        if (error instanceof PartialSaveError) state.steps.profile = 'error'
      } else state.stepsVisible = false
      if (error instanceof PartialSaveError) {
        state.savedRkey = error.rkey
        state.saveError = partialSaveText(error)
      } else if (error instanceof InvalidLinkError) {
        state.urlTouched = true
        state.saveError = invalidLinkText(error)
      } else state.saveError = friendlyError(error)
      sync()
    }
  }

  function clearEncoded(): void {
    if (state.encodedUrl) URL.revokeObjectURL(state.encodedUrl)
    state.encodedUrl = null
    state.encoded = null
  }

  function paintImageStatus(): void {
    if (state.imageError) {
      imageStatus.hidden = false
      imageStatus.className = 'alert'
      setText(imageStatus, state.imageError)
    } else if (state.imageLoading) {
      imageStatus.hidden = false
      imageStatus.className = 'hint'
      setText(imageStatus, t('loadingImage'))
    } else {
      imageStatus.hidden = true
      imageStatus.className = ''
      setText(imageStatus, '')
    }
  }

  sync = () => {
    const checked = validation()
    const title = validateTitle(state.title)
    const urlIssuesShown = state.urlTouched ? checked.issues : checked.issues.filter(issue => issue !== 'empty')
    urlIssues.replaceChildren(...urlIssuesShown.map(issue => el('li', { text: linkIssueMessage(issue) })))
    urlInput.setAttribute('aria-invalid', urlIssuesShown.length > 0 ? 'true' : 'false')
    if (checked.provider) setText(providerNote, t('greenProvider', { name: checked.provider.name }))
    else setText(providerNote, '')
    providerNote.hidden = !checked.provider
    providerBadge.hidden = !checked.provider

    const count = graphemeLength(state.title)
    setText(titleCount, t('titleCount', { count, max: TITLE_MAX_GRAPHEMES }))
    titleCount.classList.toggle('over', count > TITLE_MAX_GRAPHEMES || title.issues.length > 0)
    titleIssues.replaceChildren(...title.issues.map(issue => el('li', { text: titleIssueMessage(issue) })))
    titleInput.setAttribute('aria-invalid', title.issues.length > 0 ? 'true' : 'false')
    if (presetInput.value !== state.presetText) presetInput.value = state.presetText
    const color = normalizeColor(state.presetColor)
    for (const radio of swatchRadios) radio.checked = radio.value.toUpperCase() === color

    for (const [tab, button] of tabButtons) {
      const selected = tab === state.tab
      button.setAttribute('aria-selected', selected ? 'true' : 'false')
      button.tabIndex = selected ? 0 : -1
      const panel = panels.get(tab)
      if (panel) panel.hidden = !selected
    }

    const showCrop = bitmapTab(state.tab) && state.image !== null && state.crop !== null
    cropBlock.hidden = !showCrop
    if (showCrop) {
      placeCrop()
      if (document.activeElement !== zoom && state.crop) {
        const maxSize = Math.min(state.imageWidth, state.imageHeight)
        zoom.value = String(Math.min(8, Math.max(1, maxSize / state.crop.size)))
      }
    }
    const loaded = document.getElementById('file-loaded')
    if (loaded) {
      setText(loaded, state.image && state.tab === 'upload' && !state.imageError ? t('imageLoaded') : '')
    }
    paintImageStatus()

    paintPreview(checked.url)
    const waiting = producesIcon(state.tab) && !state.encoded && !state.encoding && !state.encodeError && bitmapTab(state.tab) && !state.image
    const saveBlocked = state.saving
      || state.encoding
      || state.imageLoading
      || checked.issues.length > 0
      || title.issues.length > 0
      || state.encodeError.length > 0
      || waiting
      || (producesIcon(state.tab) && !state.encoded)
    saveButton.disabled = saveBlocked
    setText(saveButton, t('save'))
    back.disabled = state.saving
    saveError.hidden = state.saveError.length === 0
    setText(saveError, state.saveError)
    steps.hidden = !state.stepsVisible
    setText(saveStatus, state.saving ? t('saving') : '')
    for (const name of ['upload', 'link', 'profile'] as const) {
      const mark = state.steps[name]
      stepItems[name].dataset.state = mark
      setText(stepStates[name], t(STEP_KEYS[mark]))
    }
    form.setAttribute('aria-busy', state.saving || state.encoding ? 'true' : 'false')
    setStatus(state.imageError || (state.saving ? t('saving') : state.imageLoading ? t('loadingImage') : ''))
    requestAnimationFrame(() => placeCrop())
  }

  sync()
  if (state.tab === 'preset' || (bitmapTab(state.tab) && state.image)) scheduleEncode()

  function paintPreview(canonical: string | null): void {
    const label = state.title.trim() || (canonical ? getLinkHost(canonical) : '')
    const previewUrl = state.tab === 'none'
      ? null
      : state.tab === 'keep'
        ? state.keepIconUrl
        : state.encodedUrl
    mocks.replaceChildren(bskyMock('light', label, previewUrl), bskyMock('dark', label, previewUrl))
    const showImage = Boolean(previewUrl)
    zoomPreview.hidden = !showImage
    previewEmpty.hidden = showImage
    if (previewUrl) zoomPreview.src = previewUrl
    if (state.encoding) setText(previewMeta, t('encoding'))
    else if (state.encodeError) setText(previewMeta, state.encodeError)
    else if (state.tab === 'none') setText(previewMeta, t('noIcon'))
    else if (state.tab === 'keep' && state.keepMime && state.keepBytes !== null) {
      setText(previewMeta, t('keptMeta', { mime: mimeName(state.keepMime), bytes: formatBytes(state.keepBytes, getLocale()) }))
    } else if (state.encoded) {
      setText(previewMeta, t('fileMeta', {
        size: state.encoded.size,
        mime: mimeName(state.encoded.mime),
        bytes: formatBytes(state.encoded.blob.size, getLocale()),
      }))
    } else if (bitmapTab(state.tab) && !state.image) setText(previewMeta, t('chooseImage'))
    else setText(previewMeta, '')
  }
}

function draw(
  size: number,
  tab: IconTab,
  preset: Preset,
  emoji: HTMLImageElement | undefined,
  image: HTMLImageElement | null,
  crop: Crop | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  if (tab === 'preset') drawPreset(context, size, preset, emoji)
  else if (image && crop) context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size)
  return canvas
}

function currentPresetFrom(state: EditorState): Preset {
  return {
    kind: state.presetKind,
    text: state.presetText || '?',
    background: normalizeColor(state.presetColor),
  }
}

function producesIcon(tab: IconTab): boolean {
  return tab === 'upload' || tab === 'url' || tab === 'favicon' || tab === 'preset'
}

function bitmapTab(tab: IconTab): boolean {
  return tab === 'upload' || tab === 'url' || tab === 'favicon'
}

function hostLetter(input: string): string {
  const url = validateLink(input, { existingCount: 0, editing: true }).url
  if (!url) return ''
  const letter = firstGrapheme(getLinkHost(url))
  return /^[a-z]$/i.test(letter) ? letter.toUpperCase() : ''
}

function normalizeColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : '#32BCAD'
}

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth < 1 || image.naturalHeight < 1) reject(new Error('decode'))
      else resolve(image)
    }
    image.onerror = () => reject(new Error('decode'))
    image.src = url
  })
}

function imageErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('not an image')) return t('notImage')
  if (message.includes('10 MB')) return t('imageTooBig')
  if (message.includes('HTTPS')) return t('imageHttps')
  return t('imageError')
}

function panel(title: MessageKey, id: string, ...body: Array<Node | null>): HTMLElement {
  return el('section', { className: 'db-panel cast', attrs: { 'aria-labelledby': `${id}-title` } },
    el('h2', { className: 'db-panel-head', attrs: { id: `${id}-title` }, text: t(title) }),
    el('div', { className: 'panel-b stack' }, ...body),
  )
}

// The Bluesky app's profile-links row (social-app, features/profileLinks):
// secondary pills of 14px medium type with a 16px favicon and an outbound
// arrow. Both themes are drawn side by side so the icon is checked on each.
function bskyMock(theme: 'light' | 'dark', label: string, iconSrc: string | null): HTMLElement {
  const pill = (text: string, favicon: Node, current = false) =>
    el('span', { className: current ? 'bsky-pill current' : 'bsky-pill', ...(current ? { attrs: { 'aria-current': 'true' } } : {}) },
      el('span', { className: 'bsky-slot' }, favicon),
      el('span', { className: 'bsky-label', text }),
      icon('arrow-up-right', 12),
    )
  const globe = () => icon('globe', 16)
  const mine = iconSrc
    ? el('img', { className: 'bsky-favicon', attrs: { src: iconSrc, alt: '', width: 16, height: 16 } })
    : globe()
  return el('figure', { className: `bsky bsky-${theme}`, attrs: { 'aria-label': t(theme === 'light' ? 'previewLight' : 'previewDark') } },
    el('figcaption', { text: t(theme === 'light' ? 'previewLight' : 'previewDark') }),
    el('div', { className: 'bsky-screen' },
      el('div', { className: 'bsky-bio' },
        el('span', { className: 'bsky-bar' }),
        el('span', { className: 'bsky-bar' }),
      ),
      el('div', { className: 'bsky-row' },
        pill(t('exampleLeft'), globe()),
        pill(label || t('previewSample'), mine, true),
        pill(t('exampleRight'), globe()),
      ),
    ),
  )
}
