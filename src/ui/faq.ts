import { t, type MessageKey } from '../i18n'
import { el } from './dom'

export const FAQ_ITEMS: ReadonlyArray<readonly [question: MessageKey, answer: MessageKey]> = [
  ['faqWhatQ', 'faqWhatA'],
  ['faqWhereQ', 'faqWhereA'],
  ['faqClientsQ', 'faqClientsA'],
  ['faqRemoveQ', 'faqRemoveA'],
  ['faqRejectedQ', 'faqRejectedA'],
  ['faqPasswordQ', 'faqPasswordA'],
  ['faqImageQ', 'faqImageA'],
]

export function renderFaq(): HTMLElement {
  return el('section', { className: 'panel cast faq', attrs: { 'aria-labelledby': 'faq-title' } },
    el('h2', { className: 'panel-h', attrs: { id: 'faq-title' }, text: t('faqTitle') }),
    el('div', { className: 'panel-b faq-list' },
      ...FAQ_ITEMS.map(([question, answer]) =>
        el('details', { className: 'faq-item' },
          el('summary', { text: t(question) }),
          el('p', { text: t(answer) }),
        )),
    ),
  )
}
