export function imageTargetError(url: URL): string | null {
  if (url.port && url.port !== '443') return 'port-not-allowed'
  if (url.username || url.password) return 'credentials-not-allowed'
  const host = url.hostname.toLowerCase().replace(/\.+$/, '')
  if (host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return 'ip-not-allowed'
  if (['localhost', 'local', 'internal', 'lan', 'home.arpa', 'onion'].some(suffix => host === suffix || host.endsWith(`.${suffix}`))) {
    return 'private-host'
  }
  if (!host.includes('.')) return 'single-label-host'
  return null
}
