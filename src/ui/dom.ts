type Attrs = Record<string, string | number | boolean | undefined>

export function el<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  options?: {
    className?: string
    text?: string
    attrs?: Attrs
  },
  ...children: Array<Node | string | null | false | undefined>
): HTMLElementTagNameMap[T] {
  const node = document.createElement(tag)
  if (options?.className) node.className = options.className
  if (options?.text !== undefined) node.textContent = options.text
  if (options?.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value === undefined || value === false) continue
      if (value === true) node.setAttribute(key, '')
      else node.setAttribute(key, String(value))
    }
  }
  for (const child of children) {
    if (child == null || child === false || child === '') continue
    node.append(child instanceof Node ? child : document.createTextNode(child))
  }
  return node
}

export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text
}
