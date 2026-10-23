// Manual theme per the joseli.to design system: light by default, dark or
// terminal only when picked, stored per device. Never prefers-color-scheme.

export type Theme = 'light' | 'dark' | 'terminal'

const THEMES: Theme[] = ['light', 'dark', 'terminal']
const STORAGE_KEY = 'theme'

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value)
}

export function getTheme(): Theme {
  const value = document.documentElement.getAttribute('data-theme')
  return isTheme(value) ? value : 'light'
}

export function nextTheme(theme: Theme = getTheme()): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'light'
}

function applyTheme(theme: Theme): void {
  if (theme === 'light') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

export function cycleTheme(): Theme {
  const theme = nextTheme()
  applyTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage unavailable: the choice lasts for this page view only.
  }
  return theme
}

export function onRemoteThemeChange(callback: () => void): void {
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return
    applyTheme(isTheme(event.newValue) ? event.newValue : 'light')
    callback()
  })
}
