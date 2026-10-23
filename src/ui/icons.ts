// Lucide glyphs vendored by the joseli.to design system (lucide-static@0.542.0).
const PATHS = {
  sun: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  moon: ['M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401'],
  terminal: ['M12 19h8', 'm4 17 6-6-6-6'],
} as const

export type IconName = keyof typeof PATHS

const SVG_NS = 'http://www.w3.org/2000/svg'

export function icon(name: IconName, size = 13): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  for (const [key, value] of Object.entries({
    class: `icon icon-${name}`,
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'square',
    'stroke-linejoin': 'miter',
    'aria-hidden': 'true',
    focusable: 'false',
  })) svg.setAttribute(key, value)
  if (name === 'sun') {
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', '12')
    circle.setAttribute('cy', '12')
    circle.setAttribute('r', '4')
    svg.append(circle)
  }
  for (const d of PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  return svg
}
