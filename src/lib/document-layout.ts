import { PageData, SpreadData, ParsedDocument } from '@/types/document'
import { ParsedChapter } from './mammoth-parser'

const PAGE_WIDTH = 642.52   // px — matches --page-width CSS var
const PAGE_HEIGHT = 922.2   // px — matches --page-height CSS var
const MARGIN_TOP = 48       // px
const MARGIN_BOTTOM = 48
const MARGIN_SIDE = 48
const HEADER_HEIGHT = 80    // estimated chapter header height
const FOOTNOTE_LINE_HEIGHT = 16 // px per footnote line
const FOOTNOTE_LINES_PER_ITEM = 2

export function estimateFootnoteHeight(items: { formattedContent: string }[]): number {
  if (!items.length) return 0
  const lines = items.reduce((acc, f) => {
    const chars = f.formattedContent.replace(/<[^>]+>/g, '').length
    return acc + Math.max(FOOTNOTE_LINES_PER_ITEM, Math.ceil(chars / 55))
  }, 0)
  return lines * FOOTNOTE_LINE_HEIGHT + 24 // 24 = divider + padding
}

export function measureHtml(html: string): number {
  const div = document.createElement('div')
  div.style.cssText = `
    position: absolute; visibility: hidden; pointer-events: none;
    width: ${PAGE_WIDTH - MARGIN_SIDE * 2}px;
    font-family: 'PFT Vilna', serif; font-size: 17px;
    line-height: 1.5; direction: rtl;
  `
  div.innerHTML = html
  document.body.appendChild(div)
  const h = div.offsetHeight
  document.body.removeChild(div)
  return h + 8 // 8px paragraph gap
}

export function layoutDocument(
  chapters: ParsedChapter[],
  docTitle: string
): ParsedDocument {
  const pages: PageData[] = []
  let pageIndex = 0

  for (const chapter of chapters) {
    const hasHeader = !!(chapter.chapterNumber || chapter.chapterTitle)
    const headerH = hasHeader ? HEADER_HEIGHT : 0

    // Simple layout: one chapter = one page minimum
    // For a full implementation, paragraphs would be measured and paginated
    // This gives a faithful single-chapter-per-page layout
    pageIndex++
    pages.push({
      pageNumber: pageIndex,
      totalPages: 0, // filled in below
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      subtitle: chapter.subtitle,
      calculatedHeaderHeight: headerH,
      calculatedMainHeight: PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - headerH - 120,
      mainSections: chapter.paragraphs,
      torahFootnotes: chapter.torahFootnotes,
      storyFootnotes: chapter.storyFootnotes,
    })
  }

  // Fill in totalPages
  const total = pages.length
  pages.forEach((p) => (p.totalPages = total))

  // Build spreads (right-to-left: odd pages on right, even on left)
  const spreads: SpreadData[] = []
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      spreadIndex: spreads.length,
      right: pages[i] ?? null,
      left: pages[i + 1] ?? null,
    })
  }

  return { title: docTitle, pages, spreads }
}
