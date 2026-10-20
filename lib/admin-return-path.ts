// Only allow local admin destinations; never redirect to an arbitrary URL.
export function adminReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\r\n]/.test(value)) return '/admin/events'
  try {
    const parsed = new URL(value, 'https://admin.invalid')
    if (!value.startsWith('/admin/') || parsed.origin !== 'https://admin.invalid' ||
        !parsed.pathname.startsWith('/admin/') || parsed.pathname === '/admin/login') return '/admin/events'
    return `${parsed.pathname}${parsed.search}`
  } catch { return '/admin/events' }
}
