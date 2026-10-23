import { t, type MessageKey } from '../i18n'
import { el } from './dom'

export const FAQ_ITEMS: ReadonlyArray<readonly [question: MessageKey, answer: MessageKey]> = [
  ['faqWhereQ', 'faqWhereA'],
  ['faqClientsQ', 'faqClientsA'],
  ['faqRemoveQ', 'faqRemoveA'],
  ['faqRejectedQ', 'faqRejectedA'],
  ['faqGreenQ', 'faqGreenA'],
  ['faqPasswordQ', 'faqPasswordA'],
  ['faqImageQ', 'faqImageA'],
]

export function renderFaq(): HTMLElement {
  return el('section', { className: 'db-panel cast mb-6', attrs: { 'aria-labelledby': 'faq-title' } },
    el('h2', { className: 'db-panel-head', attrs: { id: 'faq-title' } }, el('span', { text: t('faqTitle') })),
    el('div', { className: 'faq-list' },
      ...FAQ_ITEMS.map(([question, answer]) =>
        el('details', { className: 'faq-item' },
          el('summary', { text: t(question) }),
          el('p', { text: t(answer) }),
        )),
    ),
  )
}
