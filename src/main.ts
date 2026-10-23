import './assets/tailwind-4.3.3.css'
import './styles.css'
import { initLocale } from './i18n'
import { startApp } from './ui/app'
import { createShell } from './ui/shell'

initLocale()

const root = document.getElementById('app')
if (!root) throw new Error('Missing #app')

void startApp(createShell(root))
