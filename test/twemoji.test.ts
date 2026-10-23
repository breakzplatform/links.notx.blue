// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { loadTwemoji, twemojiUrl } from '../src/lib/image/twemoji'

describe('twemoji: twemojiUrl', () => {
  it('builds CDN URL for standard emoji without variation selector', () => {
    // grinning face: U+1F600
    const url = twemojiUrl('😀')
    expect(url).toBe('https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f600.svg')
  })

  it('strips U+FE0F for emoji without ZWJ (U+200D)', () => {
    // Red heart is U+2764 + U+FE0F
    const heartWithSelector = '\u2764\ufe0f'
    const url = twemojiUrl(heartWithSelector)
    expect(url).toBe('https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/2764.svg')
    expect(url).not.toContain('fe0f')

    // Star: U+2B50 U+FE0F
    const star = '\u2b50\ufe0f'
    expect(twemojiUrl(star)).toBe('https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/2b50.svg')
  })

  it('preserves U+FE0F when the sequence contains ZWJ (U+200D)', () => {
    // Eye in speech bubble: U+1F441 U+FE0F U+200D U+1F5E8 U+FE0F
    const eyeInBubble = '\u{1f441}\ufe0f\u200d\u{1f5e8}\ufe0f'
    const url = twemojiUrl(eyeInBubble)
    expect(url).toBe(
      'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f441-fe0f-200d-1f5e8-fe0f.svg',
    )
    expect(url).toContain('fe0f')
    expect(url).toContain('200d')
  })

  it('formats ZWJ sequences without FE0F', () => {
    // Technologist: U+1F468 U+200D U+1F4BB
    const technologist = '\u{1f468}\u200d\u{1f4bb}'
    const url = twemojiUrl(technologist)
    expect(url).toBe(
      'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f468-200d-1f4bb.svg',
    )
  })
})

describe('twemoji: loadTwemoji', () => {
  it('creates image with anonymous crossOrigin and resolves on load', async () => {
    const originalImage = window.Image
    let createdImg: HTMLImageElement | null = null

    class MockImage {
      crossOrigin = ''
      src = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        createdImg = this as unknown as HTMLImageElement
        setTimeout(() => {
          this.onload?.()
        }, 0)
      }
    }

    vi.stubGlobal('Image', MockImage)
    try {
      const promise = loadTwemoji('🚀')
      const img = await promise
      expect(img).toBe(createdImg)
      expect(img.crossOrigin).toBe('anonymous')
      expect(img.src).toBe('https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/1f680.svg')
    } finally {
      vi.stubGlobal('Image', originalImage)
    }
  })

  it('rejects on image load error', async () => {
    const originalImage = window.Image

    class MockFailingImage {
      crossOrigin = ''
      src = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        setTimeout(() => {
          this.onerror?.()
        }, 0)
      }
    }

    vi.stubGlobal('Image', MockFailingImage)
    try {
      await expect(loadTwemoji('🚀')).rejects.toThrow('Unable to load emoji image')
    } finally {
      vi.stubGlobal('Image', originalImage)
    }
  })
})
