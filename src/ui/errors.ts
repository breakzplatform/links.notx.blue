import { IconTooLargeError } from '../lib/image/encode'
import { ConcurrentEditError, TooManyLinksError } from '../lib/profile-links'
import { XrpcError } from '../lib/types'
import { t } from '../i18n'

export function friendlyError(error: unknown): string {
  if (error instanceof ConcurrentEditError) return t('concurrent')
  if (error instanceof TooManyLinksError) return t('tooMany')
  if (error instanceof IconTooLargeError) return t('iconTooBig')
  if (error instanceof XrpcError) return error.message || error.error
  if (error instanceof Error && error.message) return error.message
  return t('genericError')
}
