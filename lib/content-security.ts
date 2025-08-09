// Minimal HTML sanitizer used in tests and emails. For production, replace with a robust sanitizer.
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  // Escape only the most dangerous characters; keep simple for server-rendered templates
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}


