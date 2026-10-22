export function greetingName(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  const cleaned = local.replace(/[._+-]+/g, ' ').trim()
  if (!cleaned) return 'there'
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
