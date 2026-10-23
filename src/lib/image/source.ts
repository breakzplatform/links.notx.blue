import { normalizeProfileLinkUrl } from '../rules'
import { imageTargetError } from './target'

export const IMAGE_SOURCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon'] as const
const MAX_BYTES = 10 * 1024 * 1024
function allowedType(type: string): boolean {
  return (IMAGE_SOURCE_TYPES as readonly string[]).includes(type.toLowerCase())
}
function httpsUrl(input: string): string {
  const url = new URL(input)
  if (url.protocol !== 'https:') throw new Error('Image URL must use HTTPS')
  const error = imageTargetError(url)
  if (error) throw new Error(`Invalid image URL: ${error}`)
  return url.href
}
function responseType(response: Response): string {
  return response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
}
async function readImage(response: Response): Promise<Blob> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) {
    await response.body?.cancel()
    throw new Error('Image exceeds 10 MB')
  }
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0
  const reader = response.body?.getReader()
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > MAX_BYTES) {
          await reader.cancel()
          throw new Error('Image exceeds 10 MB')
        }
        chunks.push(new Uint8Array(value))
      }
    } finally { reader.releaseLock() }
  }
  return new Blob(chunks, { type: responseType(response) })
}
export async function fetchImageFromUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<Blob> {
  const canonical = httpsUrl(url)
  let response: Response | undefined
  try {
    response = await fetchImpl(canonical, { mode: 'cors' })
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
  }
  if (!response?.ok || !allowedType(responseType(response))) {
    await response?.body?.cancel()
    response = await fetchImpl(`/api/image-proxy?url=${encodeURIComponent(canonical)}`)
  }
  if (!response.ok || !allowedType(responseType(response))) {
    await response.body?.cancel()
    throw new Error(response.ok ? 'Response is not an image of an allowed type' : `Image request failed (${response.status})`)
  }
  return readImage(response)
}
export function faviconUrl(siteUrl: string): string {
  const url = normalizeProfileLinkUrl(siteUrl)
  if (!url) throw new Error('Invalid site URL')
  return `https://cardyb.bsky.app/v1/favicon?url=${encodeURIComponent(httpsUrl(url))}`
}
export function fileToBlob(file: Blob): Blob {
  if (!allowedType(file.type)) throw new Error('File is not an image of an allowed type')
  if (file.size > MAX_BYTES) throw new Error('Image exceeds 10 MB')
  return file
}
