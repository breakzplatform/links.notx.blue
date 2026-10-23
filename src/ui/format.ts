export function formatBytes(bytes: number, locale: string): string {
  if (bytes < 1000) return `${bytes} B`
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1000)
  return `${text} kB`
}

export function mimeName(mime: string): string {
  if (mime === 'image/png') return 'PNG'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'JPEG'
  if (mime === 'image/webp') return 'WebP'
  return mime
}
