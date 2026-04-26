import { PageData } from '@/types/document'
import { ChapterHeader } from './ChapterHeader'
import { FootnotesSection } from './FootnotesSection'

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
}

export function PageSurface({ page, documentTitle: _documentTitle, showMarginGuide, sourceHighlight, sourceReduce }: Props) {
  const hasFootnotes = page.torahFootnotes.length > 0 || page.storyFootnotes.length > 0

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
        {/* Chapter header */}
        <ChapterHeader
          chapterNumber={page.chapterNumber}
          chapterTitle={page.chapterTitle}
          subtitle={page.subtitle}
        />

        {/* Main text at exact measured height */}
        <section className="flex-shrink-0 overflow-hidden" style={{ height: page.calculatedMainHeight }}>
          <div className="font-vilna text-[17px] leading-[1.5] text-black main-text">
            {page.mainSections.map((s) => (
              <div key={s.id} dangerouslySetInnerHTML={{ __html: s.htmlContent }} />
            ))}
          </div>
        </section>

        {/* Spacer pushes footnotes to the bottom of the content area */}
        <div className="flex-1" />

        {/* Footnotes pinned to the bottom */}
        {hasFootnotes && (
          <FootnotesSection
            torahFootnotes={page.torahFootnotes}
            storyFootnotes={page.storyFootnotes}
            layout={page.footnotesLayout}
            sourceHighlight={sourceHighlight}
            sourceReduce={sourceReduce}
          />
        )}

        {/* Page number */}
        <div className="text-center mt-1">
          <span className="font-vilna text-[13px] text-muted-foreground tracking-wide">
            {page.pageNumber}
          </span>
        </div>
      </div>
    </div>
  )
}
