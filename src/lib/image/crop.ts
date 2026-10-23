export type Crop = { x: number; y: number; size: number }
export function initialCrop(w: number, h: number): Crop {
  const size = Math.max(0, Math.min(w, h))
  return { x: (w - size) / 2, y: (h - size) / 2, size }
}
export function clampCrop(crop: Crop, w: number, h: number): Crop {
  const size = Math.min(Math.max(1, crop.size), Math.max(0, Math.min(w, h)))
  return { x: Math.max(0, Math.min(crop.x, w - size)), y: Math.max(0, Math.min(crop.y, h - size)), size }
}
export function zoomCrop(crop: Crop, factor: number, cx: number, cy: number, w: number, h: number): Crop {
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Zoom factor must be positive')
  const size = Math.min(Math.max(1, crop.size / factor), Math.min(w, h))
  const ratio = crop.size > 0 ? size / crop.size : 1
  return clampCrop({ x: cx - (cx - crop.x) * ratio, y: cy - (cy - crop.y) * ratio, size }, w, h)
}
export function panCrop(crop: Crop, dx: number, dy: number, w: number, h: number): Crop {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, w, h)
}
