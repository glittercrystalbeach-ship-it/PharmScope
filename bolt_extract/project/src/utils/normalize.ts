// Convert full-width digits/symbols to ASCII half-width equivalents
export function toHalfWidth(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/．/g, '.')
    .replace(/。/g, '.')
    .replace(/、/g, ',')
    .replace(/　/g, ' ');
}
