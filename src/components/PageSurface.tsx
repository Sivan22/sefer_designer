import { useRef } from 'react'
import { PageData } from '@/types/document'
import { ChapterHeader } from './ChapterHeader'
import { FootnotesSection } from './FootnotesSection'

interface Props {
  page: PageData
  documentTitle: string
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
}

export function PageSurface({ page, documentTitle: _documentTitle, showMarginGuide, sourceHighlight, sourceReduce }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)

  return (
    <div className="page-surface">
      {/* Margin guide lines */}
      {showMarginGuide && (
        <div className="absolute inset-[48px] border border-dashed border-foreground/10 pointer-events-none" />
      )}

      <div className="flex flex-col h-full px-12 pt-12 pb-12">
        {/* Chapter header */}
        <ChapterHeader
          chapterNumber={page.chapterNumber}
          chapterTitle={page.chapterTitle}
          subtitle={page.subtitle}
        />

        {/* Main text */}
        <div
          ref={mainRef}
          className="font-vilna text-[17px] leading-[1.5] text-foreground main-text flex-1"
          style={{ height: page.calculatedMainHeight, overflow: 'hidden' }}
        >
          {page.mainSections.map((s) => (
            <div key={s.id} dangerouslySetInnerHTML={{ __html: s.htmlContent }} />
          ))}
        </div>

        {/* Footnotes */}
        <FootnotesSection
          torahFootnotes={page.torahFootnotes}
          storyFootnotes={page.storyFootnotes}
          sourceHighlight={sourceHighlight}
          sourceReduce={sourceReduce}
        />

        {/* Page number */}
        <div className="text-center mt-2">
          <span className="font-vilna text-[13px] text-muted-foreground tracking-wide">
            {page.pageNumber}
          </span>
        </div>
      </div>
    </div>
  )
}
