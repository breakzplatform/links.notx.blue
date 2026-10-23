import { IconTooLargeError } from '../lib/image/encode'
import { ConcurrentEditError, InvalidLinkError, PartialSaveError, TooManyLinksError } from '../lib/profile-links'
import { XrpcError } from '../lib/types'
import { linkIssueMessage, t } from '../i18n'

export function friendlyError(error: unknown): string {
  if (error instanceof ConcurrentEditError) return t('concurrent')
  if (error instanceof TooManyLinksError) return t('tooMany')
  if (error instanceof InvalidLinkError) return invalidLinkText(error)
  if (error instanceof PartialSaveError) return partialSaveText(error)
  if (error instanceof IconTooLargeError) return t('iconTooBig')
  if (error instanceof XrpcError) return error.message || error.error
  if (error instanceof Error && error.message) return error.message
  return t('genericError')
}

export function invalidLinkText(error: InvalidLinkError): string {
  const text = error.issues.map(linkIssueMessage).filter(item => item.length > 0).join(' ')
  return text || t('genericError')
}

export function partialSaveText(error: PartialSaveError): string {
  const reason = error.cause instanceof TooManyLinksError
    ? t('tooMany')
    : error.cause instanceof ConcurrentEditError
      ? t('concurrent')
      : ''
  return reason ? `${t('partialSave')} ${reason}` : t('partialSave')
}
