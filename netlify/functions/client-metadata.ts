import { metadataResponse } from '../../server/client-metadata'

export default (request: Request): Response => metadataResponse(request)

export const config = { path: '/client-metadata.json' }
