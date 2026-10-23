import { ICON_MAX_BYTES } from '../rules'

export const ICON_SIZES = [256, 192, 128]
export interface CanvasLike {
  toBlob?: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void
  convertToBlob?: (options: { type: string; quality?: number }) => Promise<Blob>
}
export type IconEncoder = (canvas: CanvasLike, mime: string, quality?: number) => Promise<Blob | null>
export type IconEncoders = { encode?: IconEncoder; flatten?: (canvas: CanvasLike, size: number) => CanvasLike }
export class IconTooLargeError extends Error {
  constructor() { super('Unable to encode an icon within 100000 bytes'); this.name = 'IconTooLargeError' }
}
const encodeCanvas: IconEncoder = (canvas, mime, quality) => {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: mime, quality })
  if (canvas.toBlob) return new Promise(resolve => canvas.toBlob!(resolve, mime, quality))
  throw new Error('Canvas does not support image encoding')
}
function flattenCanvas(canvas: CanvasLike, size: number): CanvasLike {
  const flattened = document.createElement('canvas')
  flattened.width = flattened.height = size
  const context = flattened.getContext('2d')
  if (!context) throw new Error('Canvas context is unavailable')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, size, size)
  context.drawImage(canvas as HTMLCanvasElement, 0, 0)
  return flattened
}
export async function encodeIcon(render: (size: number) => CanvasLike, encoders: IconEncoders | IconEncoder = {}): Promise<{ blob: Blob; size: number; mime: string }> {
  const encode = typeof encoders === 'function' ? encoders : encoders.encode ?? encodeCanvas
  const flatten = typeof encoders === 'function' ? flattenCanvas : encoders.flatten ?? flattenCanvas
  let lastError: unknown
  let hasError = false
  const rememberError = (error: unknown) => {
    if (!(error instanceof IconTooLargeError)) { lastError = error; hasError = true }
  }
  const canvases: { canvas: CanvasLike; size: number }[] = []
  for (const size of ICON_SIZES) {
    const canvas = render(size)
    canvases.push({ canvas, size })
    for (const [mime, quality] of [['image/png', undefined], ['image/webp', 0.92], ['image/webp', 0.85], ['image/webp', 0.75]] as const) {
      try {
        const blob = await encode(canvas, mime, quality)
        if (blob && blob.type === mime && blob.size <= ICON_MAX_BYTES) return { blob, size, mime }
      } catch (error) { rememberError(error) }
    }
  }
  // Try JPEG only after all alpha-preserving sizes; composite onto white explicitly.
  for (const { canvas, size } of canvases) {
    const mime = 'image/jpeg'
    try {
      const blob = await encode(flatten(canvas, size), mime, 0.85)
      if (blob && blob.type === mime && blob.size <= ICON_MAX_BYTES) return { blob, size, mime }
    } catch (error) { rememberError(error) }
  }
  if (hasError) throw lastError
  throw new IconTooLargeError()
}
