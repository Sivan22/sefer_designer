import { hebrewPageNumber } from '@/lib/hebrew-numerals'

interface Props {
  pageNumber: number
  chapterInfo?: string   // e.g. "פרק ז: מצדיקי הרבים ככוכבים"
  bookTitle?: string     // e.g. "שפע"
  sectionTitle?: string  // e.g. "שער התורה" — shown on even pages
  authorName?: string    // e.g. "יואל"
}

// Top-of-page running header — clones the example PDF layout:
//
//   [pageNum]  [authorName]   [centerText]   [bookTitle]
//
// where centerText is `chapterInfo` on odd pages and `sectionTitle` on even
// pages. The whole strip lives inside the page's left/right margins.
//
// Visual: bookTitle and authorName are large stylised words; chapterInfo /
// sectionTitle is the small caption between them; the page number sits
// flush at the outside corner. Direction is RTL so children render
// right-to-left in source order.
export function RunningHeader({
  pageNumber,
  chapterInfo,
  bookTitle = 'שפע',
  sectionTitle = 'שער התורה',
  authorName = 'יואל',
}: Props) {
  const center = (pageNumber % 2 === 1 ? chapterInfo : sectionTitle) || sectionTitle
  // Match example.pdf running header. Both שפע (book title, RIGHT edge) and
  // יואל (author, LEFT edge) sit at the SAME fixed inset from their respective
  // page edges → symmetric mirror layout. Chapter / section caption is dead-
  // centre. The page number lives outside everything in the far-left corner.
  const bigTitleStyle: React.CSSProperties = {
    fontSize: '18pt', lineHeight: 1, letterSpacing: '0.04em',
  }
  const edgeInset = 30  // px from each outer edge — same on both sides.
  return (
    <div
      className="relative flex-shrink-0 pb-3 mb-4 border-b border-black/10"
      style={{ direction: 'rtl', height: 56 }}
    >
      {/* Page number — far outside corner */}
      <span
        className="absolute bottom-3 font-vilna font-bold text-black"
        style={{ fontSize: '12.8pt', lineHeight: 1, left: 0, direction: 'ltr' }}
      >
        {hebrewPageNumber(pageNumber)}
      </span>

      {/* Chapter / section caption — dead centre on the page */}
      <span
        className="absolute bottom-3 font-vilna text-black/80 whitespace-nowrap"
        style={{
          fontSize: '11.56pt',
          lineHeight: 1.2,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {center}
      </span>

      {/* Book title — fixed inset from RIGHT edge */}
      <span
        className="absolute bottom-3 font-vilna font-bold text-black"
        style={{ ...bigTitleStyle, right: edgeInset }}
      >
        {bookTitle}
      </span>

      {/* Author — same fixed inset from LEFT edge (mirror) */}
      <span
        className="absolute bottom-3 font-vilna font-bold text-black"
        style={{ ...bigTitleStyle, left: edgeInset }}
      >
        {authorName}
      </span>
    </div>
  )
}
