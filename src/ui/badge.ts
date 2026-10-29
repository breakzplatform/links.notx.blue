import { t } from '../i18n'
import { el } from './dom'

export function blueskyIconBadge(): HTMLElement {
  const tip = t('blueskyIconBadgeTip')
  return el('span', { className: 'db-chip db-chip-bsky', attrs: { title: tip, 'aria-label': `${t('blueskyIconBadge')}. ${tip}` }, text: t('blueskyIconBadge') })
}
