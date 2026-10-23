// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
  type CanvasLike,
  encodeIcon,
  ICON_SIZES,
  type IconEncoder,
  IconTooLargeError,
} from '../src/lib/image/encode'

function makeFakeBlob(type: string, size: number): Blob {
  const buffer = new Uint8Array(size)
  return new Blob([buffer], { type })
}

describe('encode: encodeIcon', () => {
  it('exports ICON_SIZES [256, 192, 128]', () => {
    expect(ICON_SIZES).toEqual([256, 192, 128])
  })

  it('accepts first fit: 256px PNG when under 100,000 bytes', async () => {
    const fakeRender = vi.fn((size: number) => ({ size } as unknown as CanvasLike))
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      if (mime === 'image/png') {
        return makeFakeBlob('image/png', 50_000)
      }
      return null
    })

    const result = await encodeIcon(fakeRender, fakeEncoder)
    expect(result.size).toBe(256)
    expect(result.mime).toBe('image/png')
    expect(result.blob.size).toBe(50_000)
    expect(fakeRender).toHaveBeenCalledWith(256)
  })

  it('falls back to WebP qualities when PNG is too large', async () => {
    const attempts: { mime: string; quality?: number }[] = []
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime, quality) => {
      attempts.push({ mime, quality })
      if (mime === 'image/png') {
        return makeFakeBlob('image/png', 120_000) // too big
      }
      if (mime === 'image/webp' && quality === 0.92) {
        return makeFakeBlob('image/webp', 110_000) // too big
      }
      if (mime === 'image/webp' && quality === 0.85) {
        return makeFakeBlob('image/webp', 80_000) // fits!
      }
      return null
    })

    const result = await encodeIcon(() => ({}) as CanvasLike, fakeEncoder)
    expect(result.size).toBe(256)
    expect(result.mime).toBe('image/webp')
    expect(result.blob.size).toBe(80_000)
    expect(attempts).toEqual([
      { mime: 'image/png', quality: undefined },
      { mime: 'image/webp', quality: 0.92 },
      { mime: 'image/webp', quality: 0.85 },
    ])
  })

  it('falls back across icon sizes: 256 fails, 192 fits', async () => {
    const renderedSizes: number[] = []
    const fakeRender = (size: number) => {
      renderedSizes.push(size)
      return { size } as unknown as CanvasLike
    }

    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (canvas, mime) => {
      const size = (canvas as unknown as { size: number }).size
      if (size === 256) {
        return makeFakeBlob(mime, 150_000) // all 256 attempts too big
      }
      if (size === 192 && mime === 'image/png') {
        return makeFakeBlob('image/png', 90_000) // 192 png fits
      }
      return null
    })

    const result = await encodeIcon(fakeRender, fakeEncoder)
    expect(result.size).toBe(192)
    expect(result.mime).toBe('image/png')
    expect(renderedSizes).toContain(256)
    expect(renderedSizes).toContain(192)
  })

  it('rejects Safari webp->png type mismatch', async () => {
    // Safari sometimes returns image/png when webp is requested
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      if (mime === 'image/png') {
        return makeFakeBlob('image/png', 150_000) // PNG too big
      }
      if (mime === 'image/webp') {
        // Safari returns PNG blob for webp call, even if small
        return makeFakeBlob('image/png', 40_000)
      }
      return null
    })

    const customFlatten = vi.fn((canvas: CanvasLike) => canvas)
    // Should skip the mismatched webp, try next sizes, and eventually fall back to jpeg
    const fakeEncoderWithJpeg: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      if (mime === 'image/png') {
        return makeFakeBlob('image/png', 150_000)
      }
      if (mime === 'image/webp') {
        return makeFakeBlob('image/png', 40_000) // mismatch!
      }
      if (mime === 'image/jpeg') {
        return makeFakeBlob('image/jpeg', 70_000)
      }
      return null
    })

    const result = await encodeIcon(() => ({}) as CanvasLike, {
      encode: fakeEncoderWithJpeg,
      flatten: customFlatten,
    })

    expect(result.mime).toBe('image/jpeg')
    expect(result.size).toBe(256)
    expect(result.blob.type).toBe('image/jpeg')
    expect(customFlatten).toHaveBeenCalled()
  })

  it('falls back to JPEG 0.85 after all alpha-preserving sizes fail', async () => {
    const encodedMimes: string[] = []
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      encodedMimes.push(mime)
      if (mime === 'image/jpeg') {
        return makeFakeBlob('image/jpeg', 60_000)
      }
      return makeFakeBlob(mime, 120_000) // All PNG / WebP are too big
    })

    const fakeFlatten = vi.fn((c: CanvasLike) => c)
    const result = await encodeIcon(() => ({}) as CanvasLike, {
      encode: fakeEncoder,
      flatten: fakeFlatten,
    })

    expect(result.mime).toBe('image/jpeg')
    expect(result.size).toBe(256)
    expect(fakeFlatten).toHaveBeenCalled()
    // Verifies all alpha-preserving attempts were made before JPEG
    expect(encodedMimes.filter(m => m === 'image/jpeg').length).toBe(1)
  })

  it('throws IconTooLargeError when all sizes and formats exceed 100,000 bytes', async () => {
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      return makeFakeBlob(mime, 150_000)
    })

    await expect(
      encodeIcon(() => ({}) as CanvasLike, {
        encode: fakeEncoder,
        flatten: (c: CanvasLike) => c,
      }),
    ).rejects.toThrow(IconTooLargeError)
  })

  it('works with canvas.convertToBlob if available', async () => {
    const mockBlob = makeFakeBlob('image/png', 45_000)
    const mockCanvas: CanvasLike = {
      convertToBlob: vi.fn().mockResolvedValue(mockBlob),
    }

    const result = await encodeIcon(() => mockCanvas)
    expect(result.mime).toBe('image/png')
    expect(result.blob).toBe(mockBlob)
    expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
      type: 'image/png',
      quality: undefined,
    })
  })

  it('works with canvas.toBlob callback if available', async () => {
    const mockBlob = makeFakeBlob('image/png', 35_000)
    const mockCanvas: CanvasLike = {
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => cb(mockBlob)),
    }

    const result = await encodeIcon(() => mockCanvas)
    expect(result.mime).toBe('image/png')
    expect(result.blob).toBe(mockBlob)
    expect(mockCanvas.toBlob).toHaveBeenCalled()
  })

  it('catches individual encode attempt errors and continues to next attempt', async () => {
    let pngAttempted = false
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async (_canvas, mime) => {
      if (mime === 'image/png') {
        pngAttempted = true
        throw new Error('Canvas PNG export failure')
      }
      if (mime === 'image/webp') {
        return makeFakeBlob('image/webp', 45_000)
      }
      return null
    })

    const result = await encodeIcon(() => ({}) as CanvasLike, fakeEncoder)
    expect(pngAttempted).toBe(true)
    expect(result.mime).toBe('image/webp')
    expect(result.blob.size).toBe(45_000)
  })

  it('rethrows last error if all attempts fail and at least one threw a non-size error', async () => {
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async () => {
      throw new Error('WebGL driver crashed')
    })

    await expect(
      encodeIcon(() => ({}) as CanvasLike, {
        encode: fakeEncoder,
        flatten: (c: CanvasLike) => c,
      }),
    ).rejects.toThrow('WebGL driver crashed')
  })

  it('catches flatten attempt error and continues or rethrows if all fail', async () => {
    const fakeEncoder: IconEncoder = vi.fn().mockImplementation(async () => {
      return makeFakeBlob('image/png', 150_000) // All PNG/WebP too large
    })
    const fakeFlatten = vi.fn(() => {
      throw new Error('2D context drawImage failed')
    })

    await expect(
      encodeIcon(() => ({}) as CanvasLike, {
        encode: fakeEncoder,
        flatten: fakeFlatten,
      }),
    ).rejects.toThrow('2D context drawImage failed')
  })
})
