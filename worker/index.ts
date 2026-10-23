import { proxyImage } from './proxy'

export default {
  fetch(request: Request, env: { ASSETS: Fetcher; IMAGE_PROXY_LIMITER?: RateLimit }): Promise<Response> {
    return new URL(request.url).pathname === '/api/image-proxy' ? proxyImage(request, fetch, env.IMAGE_PROXY_LIMITER) : env.ASSETS.fetch(request)
  },
}
