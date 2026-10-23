import { proxyImage } from '../../server/proxy'

export default (request: Request): Promise<Response> => proxyImage(request)

// Netlify reads this statically at deploy time. The rate limit runs at the
// edge, per client IP and per domain, before the function is invoked.
export const config = {
  path: '/api/image-proxy',
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
