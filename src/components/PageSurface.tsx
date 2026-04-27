import { useRef } from 'react'
import { PageData } from '@/types/document'
import { ChapterHeader } from './ChapterHeader'
import { FootnotesSection } from './FootnotesSection'
import { RunningHeader } from './RunningHeader'

// Must match layout engine constants in document-layout.ts
const MARGIN_T = 111
const MARGIN_B = 96
const MARGIN_I = 99
const MARGIN_O = 99
const PAGE_H = 978.21

interface Props {
  page: PageData
  documentTitle: string
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
  bookTitle?: string
  sectionTitle?: string
  authorName?: string
  onBodyHeightChange?: (pageNumber: number, height: number) => void
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
  onBodyHeightChange,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const hasFootnotes = page.torahFootnotes.length > 0 || page.storyFootnotes.length > 0
  const hasBody = page.calculatedMainHeight > 0 && page.mainSections.length > 0
  // Layout D (notes-only): the separator sits at the very top — notes fill
  // the page from top, so the flex-1 spacer must be AFTER the notes, not
  // before them, to push only the page-number to the bottom.
  const notesOnly = hasFootnotes && !hasBody
  const draggable = !!onBodyHeightChange && hasFootnotes && hasBody
  const headerH = page.calculatedHeaderHeight

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onBodyHeightChange) return
    e.preventDefault()
    e.stopPropagation()
    const surface = surfaceRef.current
    const guide = guideRef.current
    if (!surface) return
    const rect = surface.getBoundingClientRect()
    const scaleY = rect.height / PAGE_H
    const startY = e.clientY
    const startH = page.calculatedMainHeight
    const minH = 0
    const maxH = PAGE_H - MARGIN_T - MARGIN_B - headerH
    if (guide) guide.style.opacity = '1'

    const compute = (clientY: number) => {
      const delta = (clientY - startY) / (scaleY || 1)
      return Math.max(minH, Math.min(maxH, startH + delta))
    }

    const onMove = (ev: PointerEvent) => {
      const newH = compute(ev.clientY)
      if (guide) guide.style.top = `${MARGIN_T + headerH + newH}px`
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (guide) guide.style.opacity = '0'
      const newH = compute(ev.clientY)
      if (Math.abs(newH - startH) >= 1) onBodyHeightChange(page.pageNumber, newH)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={surfaceRef} className="page-surface relative overflow-hidden">
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
            <div className="font-vilna text-[12.75pt] leading-[1.4] text-black main-text">
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

      {/* Drag handle — invisible strip overlaying the body/notes divider line.
          Hover hint + visual guide line during drag. Only rendered on pages
          that have both body and footnotes (a real divider). */}
      {draggable && (
        <div
          onPointerDown={handlePointerDown}
          className="absolute group cursor-ns-resize z-20"
          style={{
            top: MARGIN_T + headerH + page.calculatedMainHeight - 5,
            left: MARGIN_O,
            right: MARGIN_I,
            height: 10,
          }}
        >
          <div className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
               style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.08), transparent)' }} />
        </div>
      )}
      {draggable && (
        <div
          ref={guideRef}
          className="absolute pointer-events-none"
          style={{
            top: MARGIN_T + headerH + page.calculatedMainHeight,
            left: MARGIN_O,
            right: MARGIN_I,
            height: 1,
            background: 'rgba(220, 38, 38, 0.6)',
            boxShadow: '0 0 6px rgba(220, 38, 38, 0.4)',
            opacity: 0,
            transition: 'opacity 80ms',
            zIndex: 30,
          }}
        />
      )}
    </div>
  )
}
