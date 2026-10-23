import { describe, expect, it } from 'vitest'
import {
  detectPresetKind,
  drawPreset,
  firstGrapheme,
  PRESET_COLORS,
  presetForeground,
} from '../src/lib/image/preset'

function createRecordingContext(): {
  ctx: CanvasRenderingContext2D
  calls: { method: string; args: unknown[] }[]
  props: Record<string, unknown>
} {
  const calls: { method: string; args: unknown[] }[] = []
  const props: Record<string, unknown> = {}

  const ctx = {
    get fillStyle() {
      return props.fillStyle
    },
    set fillStyle(val) {
      props.fillStyle = val
      calls.push({ method: 'set:fillStyle', args: [val] })
    },
    get font() {
      return props.font
    },
    set font(val) {
      props.font = val
      calls.push({ method: 'set:font', args: [val] })
    },
    get textAlign() {
      return props.textAlign
    },
    set textAlign(val) {
      props.textAlign = val
      calls.push({ method: 'set:textAlign', args: [val] })
    },
    get textBaseline() {
      return props.textBaseline
    },
    set textBaseline(val) {
      props.textBaseline = val
      calls.push({ method: 'set:textBaseline', args: [val] })
    },
    save() {
      calls.push({ method: 'save', args: [] })
    },
    restore() {
      calls.push({ method: 'restore', args: [] })
    },
    clearRect(x: number, y: number, w: number, h: number) {
      calls.push({ method: 'clearRect', args: [x, y, w, h] })
    },
    beginPath() {
      calls.push({ method: 'beginPath', args: [] })
    },
    arc(x: number, y: number, r: number, start: number, end: number) {
      calls.push({ method: 'arc', args: [x, y, r, start, end] })
    },
    fill() {
      calls.push({ method: 'fill', args: [] })
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      calls.push({ method: 'fillText', args: [text, x, y, maxWidth] })
    },
    drawImage(img: unknown, dx: number, dy: number, dw: number, dh: number) {
      calls.push({ method: 'drawImage', args: [img, dx, dy, dw, dh] })
    },
  } as unknown as CanvasRenderingContext2D

  return { ctx, calls, props }
}

describe('preset: PRESET_COLORS', () => {
  it('includes Pix green, Bluesky blue, and black', () => {
    expect(PRESET_COLORS).toContain('#32BCAD')
    expect(PRESET_COLORS).toContain('#1185FE')
    expect(PRESET_COLORS).toContain('#000000')
    expect(PRESET_COLORS.length).toBeGreaterThanOrEqual(8)
  })
})

describe('preset: firstGrapheme', () => {
  it('extracts first character from standard ascii text', () => {
    expect(firstGrapheme('Hello')).toBe('H')
    expect(firstGrapheme('A')).toBe('A')
  })

  it('handles empty strings gracefully', () => {
    expect(firstGrapheme('')).toBe('')
  })

  it('extracts multi-byte or accented characters', () => {
    expect(firstGrapheme('São Paulo')).toBe('S')
    expect(firstGrapheme('écolier')).toBe('é')
    expect(firstGrapheme('e\u0301colier')).toBe('e\u0301')
  })

  it('extracts entire emoji sequences as a single grapheme', () => {
    expect(firstGrapheme('🎉 Party')).toBe('🎉')
    expect(firstGrapheme('👨‍💻 Code')).toBe('👨‍💻')
    expect(firstGrapheme('🇧🇷 Brasil')).toBe('🇧🇷')
  })
})

describe('preset: presetForeground', () => {
  it('throws on non-6-digit hex color strings', () => {
    expect(() => presetForeground('red')).toThrow('Expected a six-digit hex color')
    expect(() => presetForeground('#fff')).toThrow('Expected a six-digit hex color')
    expect(() => presetForeground('#1234567')).toThrow('Expected a six-digit hex color')
  })

  it('returns higher WCAG contrast foreground (#fff for darker, #111 for brighter)', () => {
    // Dark backgrounds have higher contrast with #fff
    expect(presetForeground('#000000')).toBe('#fff')
    expect(presetForeground('#9333EA')).toBe('#fff') // purple
    expect(presetForeground('#15803D')).toBe('#fff') // dark green

    // Light backgrounds have higher contrast with #111
    expect(presetForeground('#ffffff')).toBe('#111')
    expect(presetForeground('#FEF08A')).toBe('#111') // pale yellow
    expect(presetForeground('#32BCAD')).toBe('#111') // Pix green
    expect(presetForeground('#1185FE')).toBe('#111') // Bluesky blue (5.28:1 with #111 vs 3.61:1 with #fff)
  })
})

describe('preset: drawPreset', () => {
  it('draws letter preset: circle background, bold font, uppercase letter', () => {
    const { ctx, calls, props } = createRecordingContext()
    drawPreset(ctx, 100, {
      kind: 'letter',
      text: 'bluesky',
      background: '#000000',
    })

    // save and restore called
    expect(calls[0]?.method).toBe('save')
    expect(calls[calls.length - 1]?.method).toBe('restore')

    // Clears canvas
    expect(calls.some(c => c.method === 'clearRect' && c.args[0] === 0 && c.args[2] === 100)).toBe(true)

    // Draws circular arc
    const arcCall = calls.find(c => c.method === 'arc')
    expect(arcCall?.args).toEqual([50, 50, 50, 0, Math.PI * 2])

    // Sets fillStyle to background for circle
    expect(calls.some(c => c.method === 'set:fillStyle' && c.args[0] === '#000000')).toBe(true)

    // Letter properties
    expect(props.textAlign).toBe('center')
    expect(props.textBaseline).toBe('middle')
    expect(props.font).toMatch(/^bold 55(\.\d+)?px system-ui$/)
    expect(props.fillStyle).toBe('#fff') // computed contrast foreground on black

    // Fills text with uppercase first grapheme 'B'
    const textCall = calls.find(c => c.method === 'fillText')
    expect(textCall?.args[0]).toBe('B')
    expect(textCall?.args[1]).toBe(50)
    expect(textCall?.args[2]).toBe(50)
  })

  it('draws letter preset with explicit foreground color', () => {
    const { ctx, calls } = createRecordingContext()
    drawPreset(ctx, 200, {
      kind: 'letter',
      text: 'custom',
      background: '#000000',
      foreground: '#32BCAD',
    })

    const fillTextCall = calls.find(c => c.method === 'fillText')
    expect(fillTextCall?.args[0]).toBe('C')
    // Check that foreground was set
    const styleCalls = calls.filter(c => c.method === 'set:fillStyle')
    expect(styleCalls[styleCalls.length - 1]?.args[0]).toBe('#32BCAD')
  })

  it('draws emoji preset with Twemoji image when provided', () => {
    const { ctx, calls } = createRecordingContext()
    const fakeImage = { width: 32, height: 32 } as CanvasImageSource

    drawPreset(ctx, 100, {
      kind: 'emoji',
      text: '🚀',
      background: '#32BCAD',
    }, fakeImage)

    // Should call drawImage instead of fillText
    expect(calls.some(c => c.method === 'fillText')).toBe(false)
    const drawImgCall = calls.find(c => c.method === 'drawImage')
    expect(drawImgCall).toBeDefined()
    // size = 100, width = 62, offset = (100 - 62) / 2 = 19
    expect(drawImgCall?.args).toEqual([fakeImage, 19, 19, 62, 62])
  })

  it('draws emoji preset fallback to fillText when emojiImage is absent', () => {
    const { ctx, calls, props } = createRecordingContext()
    drawPreset(ctx, 100, {
      kind: 'emoji',
      text: '🚀',
      background: '#32BCAD',
    })

    expect(calls.some(c => c.method === 'drawImage')).toBe(false)
    const textCall = calls.find(c => c.method === 'fillText')
    expect(textCall?.args[0]).toBe('🚀')
    expect(props.font).toContain('62px')
    expect(props.font).toContain('Apple Color Emoji')
  })
})


describe('preset: detectPresetKind', () => {
  it.each(['', 'A', 'hello', '7', '#', '*', 'é', 'e\u0301', '漢字', 'A🎉'])('detects %j as a letter', text => {
    expect(detectPresetKind(text)).toBe('letter')
  })
  it.each(['🎉', '👨‍💻', '👨‍👩‍👧‍👦', '👍🏽', '🇧🇷', '1️⃣', '#️⃣', '*⃣', '❤️', '☀️', '🎉A'])('detects %j as an emoji', text => {
    expect(detectPresetKind(text)).toBe('emoji')
  })
})
