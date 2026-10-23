import { describe, expect, it } from 'vitest'
import { clampCrop, type Crop, initialCrop, panCrop, zoomCrop } from '../src/lib/image/crop'

describe('crop: initialCrop', () => {
  it('creates centered square for landscape source', () => {
    const crop = initialCrop(1000, 600)
    expect(crop).toEqual({
      x: 200,
      y: 0,
      size: 600,
    })
  })

  it('creates centered square for portrait source', () => {
    const crop = initialCrop(400, 800)
    expect(crop).toEqual({
      x: 0,
      y: 200,
      size: 400,
    })
  })

  it('creates full bounds square for 1:1 aspect ratio source', () => {
    const crop = initialCrop(512, 512)
    expect(crop).toEqual({
      x: 0,
      y: 0,
      size: 512,
    })
  })

  it('handles zero or negative dimensions safely', () => {
    const crop = initialCrop(0, 0)
    expect(crop).toEqual({ x: 0, y: 0, size: 0 })
  })
})

describe('crop: clampCrop', () => {
  it('preserves valid crop within bounds', () => {
    const crop: Crop = { x: 50, y: 50, size: 200 }
    expect(clampCrop(crop, 500, 500)).toEqual({ x: 50, y: 50, size: 200 })
  })

  it('clamps crop position to top-left (0,0)', () => {
    const crop: Crop = { x: -30, y: -50, size: 200 }
    expect(clampCrop(crop, 500, 500)).toEqual({ x: 0, y: 0, size: 200 })
  })

  it('clamps crop position to bottom-right (w - size, h - size)', () => {
    const crop: Crop = { x: 400, y: 400, size: 200 }
    expect(clampCrop(crop, 500, 500)).toEqual({ x: 300, y: 300, size: 200 })
  })

  it('clamps crop size between 1 and min(w, h)', () => {
    // oversized
    expect(clampCrop({ x: 0, y: 0, size: 800 }, 500, 400)).toEqual({
      x: 0,
      y: 0,
      size: 400,
    })
    // undersized
    expect(clampCrop({ x: 0, y: 0, size: 0.5 }, 500, 500)).toEqual({
      x: 0,
      y: 0,
      size: 1,
    })
  })
})

describe('crop: zoomCrop', () => {
  it('throws RangeError for non-positive or non-finite factor', () => {
    const crop: Crop = { x: 50, y: 50, size: 100 }
    expect(() => zoomCrop(crop, 0, 100, 100, 500, 500)).toThrow(RangeError)
    expect(() => zoomCrop(crop, -1.5, 100, 100, 500, 500)).toThrow(RangeError)
    expect(() => zoomCrop(crop, Number.NaN, 100, 100, 500, 500)).toThrow(RangeError)
    expect(() => zoomCrop(crop, Number.POSITIVE_INFINITY, 100, 100, 500, 500)).toThrow(RangeError)
  })

  it('zooms in (factor > 1) shrinking the crop box relative to center (cx, cy)', () => {
    const initial: Crop = { x: 100, y: 100, size: 200 }
    // center is at (200, 200)
    const zoomed = zoomCrop(initial, 2, 200, 200, 500, 500)
    expect(zoomed.size).toBe(100) // 200 / 2 = 100
    // new x should be 200 - (200 - 100) * 0.5 = 150
    expect(zoomed.x).toBe(150)
    expect(zoomed.y).toBe(150)
  })

  it('zooms out (factor < 1) expanding the crop box and clamps to image boundary', () => {
    const initial: Crop = { x: 150, y: 150, size: 100 }
    const zoomed = zoomCrop(initial, 0.5, 200, 200, 500, 500)
    expect(zoomed.size).toBe(200)
    expect(zoomed.x).toBe(100)
    expect(zoomed.y).toBe(100)
  })

  it('clamps zoom out to maximum dimension min(w, h)', () => {
    const initial: Crop = { x: 100, y: 100, size: 200 }
    const zoomed = zoomCrop(initial, 0.1, 200, 200, 300, 300)
    expect(zoomed.size).toBe(300)
    expect(zoomed.x).toBe(0)
    expect(zoomed.y).toBe(0)
  })
})

describe('crop: panCrop', () => {
  it('moves crop box by dx and dy within boundaries', () => {
    const initial: Crop = { x: 100, y: 100, size: 200 }
    const panned = panCrop(initial, 25, -30, 500, 500)
    expect(panned).toEqual({
      x: 125,
      y: 70,
      size: 200,
    })
  })

  it('clamps pan at left and top boundaries', () => {
    const initial: Crop = { x: 50, y: 50, size: 200 }
    const panned = panCrop(initial, -100, -100, 500, 500)
    expect(panned).toEqual({
      x: 0,
      y: 0,
      size: 200,
    })
  })

  it('clamps pan at right and bottom boundaries', () => {
    const initial: Crop = { x: 250, y: 250, size: 200 }
    const panned = panCrop(initial, 100, 100, 500, 500)
    expect(panned).toEqual({
      x: 300, // 500 - 200 = 300
      y: 300,
      size: 200,
    })
  })
})
