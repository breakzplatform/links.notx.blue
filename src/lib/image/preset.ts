export type Preset = { kind: 'letter' | 'emoji'; text: string; background: string; foreground?: string }
export const PRESET_COLORS = ['#32BCAD', '#1185FE', '#000000', '#9333EA', '#DC2626', '#EA580C', '#CA8A04', '#15803D', '#DB2777']
export function firstGrapheme(s: string): string {
  return new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next().value?.segment ?? ''
}
export function detectPresetKind(text: string): 'letter' | 'emoji' {
  const grapheme = firstGrapheme(text)
  // Extended_Pictographic alone also covers text symbols such as © and ™, which
  // are drawn as letters unless the grapheme asks for emoji presentation.
  const isEmoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}[\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]|^[#*0-9]\uFE0F?\u20E3$/u.test(grapheme)
  return isEmoji ? 'emoji' : 'letter'
}
export function presetForeground(bg: string): string {
  if (!/^#[\da-f]{6}$/i.test(bg)) throw new Error('Expected a six-digit hex color')
  const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  const channel = (offset: number) => linear(parseInt(bg.slice(offset, offset + 2), 16) / 255)
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / (linear(17 / 255) + 0.05) ? '#fff' : '#111'
}
export function drawPreset(ctx: CanvasRenderingContext2D, size: number, preset: Preset, emojiImage?: CanvasImageSource): void {
  ctx.save()
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = preset.background
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  if (preset.kind === 'emoji' && emojiImage) {
    const width = size * 0.62
    ctx.drawImage(emojiImage, (size - width) / 2, (size - width) / 2, width, width)
  } else {
    ctx.fillStyle = preset.foreground ?? presetForeground(preset.background)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = preset.kind === 'letter' ? `bold ${size * 0.55}px system-ui` : `${size * 0.62}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
    const text = firstGrapheme(preset.text)
    ctx.fillText(preset.kind === 'letter' ? text.toUpperCase() : text, size / 2, size / 2, size * 0.8)
  }
  ctx.restore()
}
