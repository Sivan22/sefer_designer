import { PageData } from '@/types/document'
import { ChapterHeader } from './ChapterHeader'
import { FootnotesSection } from './FootnotesSection'
import { RunningHeader } from './RunningHeader'

// Must match layout engine constants in document-layout.ts
const MARGIN_T = 139
const MARGIN_B = 76
const MARGIN_I = 81
const MARGIN_O = 81

interface Props {
  page: PageData
  documentTitle: string
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
  bookTitle?: string
  sectionTitle?: string
  authorName?: string
}

export function PageSurface({
  page,
  documentTitle: _documentTitle,
  showMarginGuide,
  sourceHighlight,
  sourceReduce,
  bookTitle,
  sectionTitle,
  authorName,
}: Props) {
  const hasFootnotes = page.torahFootnotes.length > 0 || page.storyFootnotes.length > 0
  const hasBody = page.calculatedMainHeight > 0 && page.mainSections.length > 0
  // Layout D (notes-only): the separator sits at the very top — notes fill
  // the page from top, so the flex-1 spacer must be AFTER the notes, not
  // before them, to push only the page-number to the bottom.
  const notesOnly = hasFootnotes && !hasBody

  return (
    <div className="page-surface relative overflow-hidden">
      {showMarginGuide && (
        <div
          className="absolute border border-dashed border-foreground/10 pointer-events-none"
          style={{ top: MARGIN_T, bottom: MARGIN_B, left: MARGIN_O, right: MARGIN_I }}
        />
      )}

      <div
        className="flex flex-col h-full"
        style={{ paddingTop: MARGIN_T, paddingBottom: MARGIN_B, paddingLeft: MARGIN_O, paddingRight: MARGIN_I }}
      >
        {/* Running header — book / chapter info / author / page number */}
        <RunningHeader
          pageNumber={page.pageNumber}
          chapterInfo={page.runningChapterInfo}
          bookTitle={bookTitle}
          sectionTitle={sectionTitle}
          authorName={authorName}
        />

        {/* Chapter title block — only on the chapter's first page */}
        <ChapterHeader
          chapterNumber={page.chapterNumber}
          chapterTitle={page.chapterTitle}
          subtitle={page.subtitle}
        />

        {/* Main text at exact measured height */}
        {hasBody && (
          <section className="flex-shrink-0 overflow-hidden" style={{ height: page.calculatedMainHeight }}>
            <div className="font-vilna text-[11pt] leading-[1.4] text-black main-text">
              {page.mainSections.map((s) => (
                <div key={s.id} dangerouslySetInnerHTML={{ __html: s.htmlContent }} />
              ))}
            </div>
          </section>
        )}

        {/* Spacer: pushes footnotes to the bottom in normal layout. Skipped on
            notes-only pages so the notes flow from the top. */}
        {!notesOnly && <div className="flex-1" />}

        {hasFootnotes && (
          <FootnotesSection
            torahFootnotes={page.torahFootnotes}
            storyFootnotes={page.storyFootnotes}
            layout={page.footnotesLayout}
            sourceHighlight={sourceHighlight}
            sourceReduce={sourceReduce}
          />
        )}

        {notesOnly && <div className="flex-1" />}
      </div>
    </div>
  )
}
