// Standard Hebrew gematria for page numbers: 1→א, 10→י, 11→יא, 15→טו, 16→טז, 100→ק
const ONES     = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS     = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת']

export function hebrewPageNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n)

  let result = ''
  let h = Math.floor(n / 100)
  while (h >= 5) { result += 'ת'; h -= 4 }
  result += HUNDREDS[h]

  const rem = n % 100
  if (rem === 15) return result + 'טו'
  if (rem === 16) return result + 'טז'
  result += TENS[Math.floor(rem / 10)]
  result += ONES[rem % 10]
  return result
}
