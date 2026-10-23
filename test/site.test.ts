import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { clientMetadata } from '../server/client-metadata'
import { SCOPE } from '../src/lib/config'

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

  it('is defined once as the green tokens, terminal keeping amber', () => {
    expect(input).toContain('--links-ink: #2E6B3F')
    expect(input).toContain('--project-ink: var(--links-ink)')
    expect(input).toContain('--project-ink: var(--links-ink-dark)')
    expect(input).toContain('--project-ink: var(--ink-amber)')
  })

  const themes = [
    ['light', '--links-ink', '--links-ink-contrast', hex('surface-page', light, 'light')],
    ['dark', '--links-ink-dark', '--links-ink-dark-contrast', hex('surface-page', dark, 'dark')],
  ] as const
  for (const [theme, inkName, onName, paper] of themes) {
    it(`meets 4.5:1 on its text and on the paper in ${theme}`, () => {
      const pick = (name: string) => input.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))![1]!
      expect(contrast(pick(inkName), pick(onName))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(pick(inkName), paper)).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe('privacy and abuse', () => {
  it('leaves no site-owned privacy page or old contact', () => {
    for (const file of ['index.html', '404.html', 'README.md', 'src/lib/config.ts', 'src/ui/shell.ts']) {
      expect(read(file)).not.toContain('abuse@joseli.to')
    }
    expect(clientMetadata('https://example.com').policy_uri).toBe('https://notx.blue/privacy')
    expect(read('src/ui/shell.ts')).toContain('https://notx.blue/privacy')
  })
})

describe('client metadata', () => {
  it('is per origin, so previews can sign in', () => {
    const meta = clientMetadata('https://preview--links.netlify.app')
    expect(meta.client_id).toBe('https://preview--links.netlify.app/client-metadata.json')
    expect(meta.redirect_uris).toEqual(['https://preview--links.netlify.app/'])
    expect(meta.scope).toBe(SCOPE)
  })
})
