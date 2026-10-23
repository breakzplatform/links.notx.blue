import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

function hex(name: string, css: string, block: 'light' | 'dark'): string {
  const section = block === 'dark' ? css.slice(css.indexOf('[data-theme="dark"]')) : css.slice(0, css.indexOf('[data-theme="dark"]'))
  const match = section.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!match?.[1]) throw new Error(`missing ${name}`)
  return match[1]
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('netlify.toml', () => {
  const toml = read('netlify.toml')
  it('redirects /privacy to the central policy with a 301', () => {
    expect(toml).toMatch(/from = "\/privacy"\s+to = "https:\/\/notx\.blue\/privacy"\s+status = 301/)
  })
})

describe('project ink', () => {
  const light = read('scripts/ds/tokens/colors.css')
  const dark = read('scripts/ds/tokens/dark.css')
  const input = read('scripts/tailwind-input.css')

  it('is the brown ink, not blue', () => {
    expect(input).toContain('--project-ink: var(--ink-brown)')
    expect(input).toContain('--project-ink-contrast: var(--on-brown)')
  })

  for (const [theme, css, paper] of [['light', light, 'surface-card'], ['dark', dark, 'surface-card']] as const) {
    it(`meets 4.5:1 on its text and on the paper in ${theme}`, () => {
      const ink = hex('ink-brown', css, theme)
      const onInk = hex('on-brown', css, theme)
      expect(contrast(ink, onInk)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(ink, hex(paper, css, theme))).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe('privacy and abuse', () => {
  it('leaves no site-owned privacy page or old contact', () => {
    for (const file of ['index.html', '404.html', 'README.md', 'src/lib/config.ts', 'src/ui/shell.ts']) {
      expect(read(file)).not.toContain('abuse@joseli.to')
    }
    expect(read('public/client-metadata.json')).toContain('https://notx.blue/privacy')
    expect(read('src/ui/shell.ts')).toContain('https://notx.blue/privacy')
  })
})
