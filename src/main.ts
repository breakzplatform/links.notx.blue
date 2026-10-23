import './assets/tailwind-4.3.3.css'
import './styles.css'
import { initLocale, subscribeLocale } from './i18n'
import { startApp } from './ui/app'
import { renderPrivacy } from './ui/privacy'
import { createShell } from './ui/shell'

initLocale()

const root = document.getElementById('app')
if (!root) throw new Error('Missing #app')

const shell = createShell(root)
const privacy = /\/privacy(\.html)?\/?$/.test(location.pathname)

if (privacy) {
  const paint = () => {
    shell.refresh()
    renderPrivacy(shell.main)
  }
  subscribeLocale(paint)
  paint()
} else {
  void startApp(shell)
}
