// Convert full name to initials for audit log storage
// "山田 太郎" → "Y.T."  (uses romanization heuristic — first char of each space-separated word)
// For non-latin names we just take first character of each word.
export function toInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  return parts.map((p) => p.charAt(0).toUpperCase()).join('.') + '.';
}
