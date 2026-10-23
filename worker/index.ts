export default { fetch: (r: Request, env: { ASSETS: Fetcher }) => env.ASSETS.fetch(r) }
