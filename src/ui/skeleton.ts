import './skeleton.css'
import { t } from '../i18n'
import { el } from './dom'
import { renderFaq } from './faq'
import { renderPromo } from './landing'

function block(className: string): HTMLElement {
  return el('span', { className: `skel ${className}`, attrs: { 'aria-hidden': 'true' } })
}

export function renderLinksSkeleton(main: HTMLElement): void {
  main.replaceChildren(
    el('section', { className: 'stack' },
      el('section', { className: 'db-panel cast links-skeleton', attrs: { 'aria-busy': 'true', 'aria-labelledby': 'page-title' } },
        el('h1', { className: 'db-panel-head', attrs: { id: 'page-title', tabindex: '-1' } },
          el('span', { text: t('panelLinks') }),
          el('span', { className: 'db-panel-status skel-status', attrs: { 'aria-hidden': 'true' } }),
        ),
        el('div', { className: 'panel-b stack' },
          el('div', { className: 'profile' },
            block('avatar'),
            el('div', {},
              el('p', { className: 'name' }, block('skel-name')),
              el('p', { className: 'handle' }, block('skel-handle')),
            ),
            block('skel-control skel-signout'),
          ),
          el('ol', { className: 'links' }, ...Array.from({ length: 3 }, () =>
            el('li', { className: 'link ranked', attrs: { 'aria-hidden': 'true' } },
              el('span', { className: 'rank' }, block('skel-rank')),
              block('link-icon'),
              el('div', { className: 'link-copy' },
                el('p', { className: 'link-title' }, block('skel-title')),
                el('p', { className: 'url' }, block('skel-url')),
              ),
              el('div', { className: 'actions' },
                block('skel-control skel-square'), block('skel-control skel-square'),
                block('skel-control skel-edit'), block('skel-control skel-remove'),
              ),
            ),
          )),
          el('div', { className: 'actions' }, block('skel-control skel-add')),
        ),
      ),
      renderFaq(),
      renderPromo(),
    ),
  )
}
