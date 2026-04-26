import type { PageData, SpreadData, ParsedDocument, FootnoteItem, FootnotesLayout } from '@/types/document'
import type { ParsedDocx, TextChunk } from './mammoth-parser'

// ── Page geometry (matches CSS custom properties) ─────────────────────────────
const PAGE_H        = 922.2
const PAGE_W        = 642.52
const MARGIN_T      = 139    // top margin px
const MARGIN_B      = 76     // bottom margin px
const MARGIN_I      = 81     // inside margin px
const MARGIN_O      = 81     // outside margin px
const CONTENT_W     = PAGE_W - MARGIN_I - MARGIN_O   // 480.52
const CONTENT_H     = PAGE_H - MARGIN_T - MARGIN_B   // 707.2

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP           = 24     // gap between dual footnote columns
const COL_W             = (CONTENT_W - COL_GAP) / 2  // ≈ 228.26 px
const MIN_COL_H         = 20     // min px to bother rendering columns
const CHAPTER_HEADER_H  = 100    // estimated chapter-header height
const COL_HEADER_H      = 50     // column-divider header height
const MAIN_FOOT_SPACER  = 12     // spacer between main text and footnotes
const FLOAT_THRESHOLD   = 2      // |torahLines - storyLines| >= this → float layout
const CHARS_PER_LINE    = 45     // for line-count estimation
const MAX_PAGES         = 500

// ── DOM measurement container ─────────────────────────────────────────────────
let _mc: HTMLDivElement | null = null
function mc(): HTMLDivElement {
  if (!_mc || !document.body.contains(_mc)) {
    _mc = document.createElement('div')
    _mc.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:-99999px;left:-99999px;z-index:-1'
    document.body.appendChild(_mc)
  }
  return _mc
}

function measure(el: HTMLElement): number {
  mc().appendChild(el)
  const h = el.getBoundingClientRect().height
  mc().removeChild(el)
  return Math.ceil(h)
}

function measureMainHtml(html: string): number {
  if (!html.trim()) return 0
  const el = document.createElement('div')
  el.style.cssText = `width:${CONTENT_W}px;font-family:'PFT Vilna',serif;font-size:17px;line-height:1.5;direction:rtl;unicode-bidi:plaintext`
  el.className = 'main-text'
  el.innerHTML = html
  return measure(el)
}

function itemsHtml(items: FootnoteItem[], fontClass: string, sizeClass: string): string {
  return items.map(f =>
    `<div class="${fontClass} ${sizeClass} footnote-item" style="direction:rtl">${f.formattedContent}</div>`
  ).join('')
}

// Measure items in a single column at given width
function measureColumnItems(items: FootnoteItem[], colWidth: number, fontClass: string, sizeClass: string): number {
  if (!items.length) return 0
  const el = document.createElement('div')
  el.style.cssText = `width:${colWidth}px`
  el.className = 'space-y-2'
  el.innerHTML = itemsHtml(items, fontClass, sizeClass)
  return measure(el)
}

// Measure the actual 2-column newspaper layout (like the rendered FootnotesSection)
function measureTwoColLayout(items: FootnoteItem[], fontClass: string, sizeClass: string): number {
  if (!items.length) return 0
  const outer = document.createElement('div')
  outer.className = 'single-source-flow'
  outer.style.cssText = `width:${CONTENT_W}px;column-count:2;column-gap:1.5rem`
  const inner = document.createElement('div')
  inner.className = 'space-y-2'
  inner.innerHTML = itemsHtml(items, fontClass, sizeClass)
  outer.appendChild(inner)
  return measure(outer)
}

// ── Preload custom fonts for accurate measurements ────────────────────────────
async function preloadFonts(): Promise<void> {
  const specs = [
    "400 17px 'PFT Vilna'",
    "700 17px 'PFT Vilna'",
    "400 14px 'PFT Frank'",
    "400 15px 'Shefa'",
    "400 14px 'Tehila'",
  ]
  await Promise.allSettled(specs.map(s => document.fonts.load(s)))
}

// ── Line-count estimator (for float-wrap decision) ────────────────────────────
function estimateLines(items: FootnoteItem[]): number {
  const chars = items.reduce(
    (s, f) => s + f.formattedContent.replace(/<[^>]+>/g, '').length,
    0
  )
  return Math.ceil(chars / CHARS_PER_LINE)
}

// ── Per-column fit ────────────────────────────────────────────────────────────
function fitColumn(
  notes: FootnoteItem[],
  maxH: number,
  colWidth: number,
  fontClass: string,
  sizeClass: string
): { fitted: FootnoteItem[]; overflow: FootnoteItem[] } {
  let fitted: FootnoteItem[] = []
  for (let i = 0; i < notes.length; i++) {
    const candidate = [...fitted, notes[i]]
    const h = measureColumnItems(candidate, colWidth, fontClass, sizeClass)
    if (h <= maxH) {
      fitted = candidate
    } else {
      return { fitted, overflow: notes.slice(i) }
    }
  }
  return { fitted, overflow: [] }
}

// ── Footnote fit result ───────────────────────────────────────────────────────
interface FitResult {
  torahFitted: FootnoteItem[]
  storyFitted: FootnoteItem[]
  torahOverflow: FootnoteItem[]
  storyOverflow: FootnoteItem[]
  totalHeight: number
  layout: FootnotesLayout
}

function noFit(torah: FootnoteItem[], story: FootnoteItem[]): FitResult {
  return {
    torahFitted: [],
    storyFitted: [],
    torahOverflow: torah,
    storyOverflow: story,
    totalHeight: 0,
    layout: 'none',
  }
}

function fitFootnotes(
  torah: FootnoteItem[],
  story: FootnoteItem[],
  maxH: number
): FitResult {
  if (!torah.length && !story.length) {
    return { ...noFit([], []), torahOverflow: [], storyOverflow: [] }
  }
  const availForCols = maxH - COL_HEADER_H
  if (availForCols < MIN_COL_H) return noFit(torah, story)

  // ── Single-source ──────────────────────────────────────────────────────────
  if (!torah.length || !story.length) {
    const notes = torah.length ? torah : story
    const fontClass = torah.length ? 'font-frank' : 'font-shefa'
    const sizeClass = torah.length ? 'text-[10pt] leading-relaxed' : 'text-[11pt] leading-snug'
    const layout: FootnotesLayout = torah.length ? 'single-torah' : 'single-story'

    // Fit using actual 2-column rendered height — greedily add notes until they exceed availForCols
    let fitted: FootnoteItem[] = []
    let overflow: FootnoteItem[] = []
    for (let i = 0; i < notes.length; i++) {
      const candidate = [...fitted, notes[i]]
      const h = measureTwoColLayout(candidate, fontClass, sizeClass)
      if (h <= availForCols) {
        fitted = candidate
      } else {
        overflow = notes.slice(i)
        break
      }
    }
    // Safety: always place at least 1 note to prevent infinite overflow loops
    if (fitted.length === 0 && notes.length > 0) {
      fitted = [notes[0]]
      overflow = notes.slice(1)
    }
    const renderedColH = fitted.length ? measureTwoColLayout(fitted, fontClass, sizeClass) : 0
    const totalHeight = fitted.length ? COL_HEADER_H + renderedColH : 0
    return {
      torahFitted: torah.length ? fitted : [],
      storyFitted: story.length ? fitted : [],
      torahOverflow: torah.length ? overflow : [],
      storyOverflow: story.length ? overflow : [],
      totalHeight,
      layout,
    }
  }

  // ── Dual-source ────────────────────────────────────────────────────────────
  const torahLines = estimateLines(torah)
  const storyLines = estimateLines(story)
  const layout: FootnotesLayout = Math.abs(torahLines - storyLines) >= FLOAT_THRESHOLD ? 'float' : 'grid'

  const torahFit = fitColumn(torah, availForCols, COL_W, 'font-frank', 'text-[10pt] leading-relaxed')
  const storyFit = fitColumn(story, availForCols, COL_W, 'font-shefa', 'text-[11pt] leading-snug')

  // Safety: always place at least 1 note per column to prevent infinite overflow loops
  const tFitted = torahFit.fitted.length ? torahFit.fitted : torah.length ? [torah[0]] : []
  const sFitted = storyFit.fitted.length ? storyFit.fitted : story.length ? [story[0]] : []
  const tOverflow = torahFit.fitted.length ? torahFit.overflow : torah.slice(1)
  const sOverflow = storyFit.fitted.length ? storyFit.overflow : story.slice(1)

  const torahH = measureColumnItems(tFitted, COL_W, 'font-frank', 'text-[10pt] leading-relaxed')
  const storyH = measureColumnItems(sFitted, COL_W, 'font-shefa', 'text-[11pt] leading-snug')
  const totalHeight = COL_HEADER_H + Math.max(torahH, storyH)

  return {
    torahFitted: tFitted,
    storyFitted: sFitted,
    torahOverflow: tOverflow,
    storyOverflow: sOverflow,
    totalHeight,
    layout,
  }
}

// ── Chunk helpers ─────────────────────────────────────────────────────────────
type ChunkWithMeta = TextChunk & {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  isFirstInChapter: boolean
}

function joinChunks(chunks: TextChunk[]): string {
  return chunks.map(c => c.html).join('\n')
}

function collectNotes(
  markers: string[],
  noteMap: Map<string, FootnoteItem>,
  existing: FootnoteItem[]
): FootnoteItem[] {
  const existingIds = new Set(existing.map(n => n.id))
  const added: FootnoteItem[] = []
  for (const m of markers) {
    const note = noteMap.get(m)
    if (note && !existingIds.has(note.id)) {
      added.push(note)
      existingIds.add(note.id)
    }
  }
  return [...existing, ...added]
}

// ── Main layout function ──────────────────────────────────────────────────────
export async function layoutDocument(parsed: ParsedDocx): Promise<ParsedDocument> {
  await preloadFonts()
  const { title, chapters, torahFootnotes, storyFootnotes } = parsed

  // Flatten all chunks into a single ordered list
  const allChunks: ChunkWithMeta[] = []
  for (const ch of chapters) {
    ch.chunks.forEach((chunk, idx) => {
      allChunks.push({
        ...chunk,
        chapterNumber: idx === 0 ? ch.chapterNumber : undefined,
        chapterTitle: idx === 0 ? ch.chapterTitle : undefined,
        subtitle: idx === 0 ? ch.subtitle : undefined,
        isFirstInChapter: idx === 0,
      })
    })
  }

  const pages: PageData[] = []
  let chunkIdx = 0
  let overflowTorah: FootnoteItem[] = []
  let overflowStory: FootnoteItem[] = []
  // Track page a marker was first referenced on (for staleness)
  const refPageMap = new Map<string, number>()

  while (chunkIdx < allChunks.length || overflowTorah.length > 0 || overflowStory.length > 0) {
    const pageNum = pages.length + 1
    if (pageNum > MAX_PAGES) break

    // Chapter header on this page?
    const firstChunk = allChunks[chunkIdx]
    const hasChapterHeader =
      !!firstChunk?.isFirstInChapter &&
      !!(firstChunk?.chapterNumber || firstChunk?.chapterTitle)
    const headerH = hasChapterHeader ? CHAPTER_HEADER_H : 0
    const avail = CONTENT_H - headerH

    // Start with overflow from previous page
    let pendingTorah = [...overflowTorah]
    let pendingStory = [...overflowStory]
    overflowTorah = []
    overflowStory = []

    // Stale overflow → emit footnote-only page
    const isStale = (f: FootnoteItem) => {
      const rp = refPageMap.get(f.marker)
      return rp !== undefined && pageNum - rp >= 2
    }
    if ([...pendingTorah, ...pendingStory].some(isStale)) {
      const fit = fitFootnotes(pendingTorah, pendingStory, avail)
      pages.push(makePage(pageNum, [], {}, headerH, fit, 0))
      overflowTorah = fit.torahOverflow
      overflowStory = fit.storyOverflow
      continue
    }

    // ── Inner chunk accumulation loop ────────────────────────────────────────
    const pageChunks: ChunkWithMeta[] = []
    let pageTorahRefs: string[] = []
    let pageStoryRefs: string[] = []

    while (chunkIdx < allChunks.length) {
      const chunk = allChunks[chunkIdx]
      const candidate = [...pageChunks, chunk]
      const candidateHtml = joinChunks(candidate)
      const mainH = measureMainHtml(candidateHtml)

      if (mainH > avail - MIN_COL_H) break  // main text won't fit

      const candTorahRefs = [...pageTorahRefs, ...chunk.torahMarkers]
      const candStoryRefs = [...pageStoryRefs, ...chunk.storyMarkers]

      const candTorahNotes = collectNotes(candTorahRefs, torahFootnotes, pendingTorah)
      const candStoryNotes = collectNotes(candStoryRefs, storyFootnotes, pendingStory)

      const hasNotes = candTorahNotes.length > 0 || candStoryNotes.length > 0
      const spacer = hasNotes ? MAIN_FOOT_SPACER : 0
      const availForFoot = avail - mainH - spacer

      const fit = fitFootnotes(candTorahNotes, candStoryNotes, availForFoot)
      const hasOverflow = fit.torahOverflow.length > 0 || fit.storyOverflow.length > 0
      const fillRatio = mainH / avail

      // Only break when NEW markers in this chunk cause overflow (not pre-existing overflow notes)
      const hasNewMarkers = chunk.torahMarkers.some(m => !pageTorahRefs.includes(m))
                         || chunk.storyMarkers.some(m => !pageStoryRefs.includes(m))
      if (hasNewMarkers && hasOverflow && fillRatio >= 0.2) break

      // Accept this chunk
      pageChunks.push(chunk)
      pageTorahRefs = candTorahRefs
      pageStoryRefs = candStoryRefs

      chunk.torahMarkers.forEach(m => { if (!refPageMap.has(m)) refPageMap.set(m, pageNum) })
      chunk.storyMarkers.forEach(m => { if (!refPageMap.has(m)) refPageMap.set(m, pageNum) })

      chunkIdx++
    }

    // Force at least one chunk to avoid infinite loop
    if (pageChunks.length === 0 && chunkIdx < allChunks.length) {
      const chunk = allChunks[chunkIdx]
      pageChunks.push(chunk)
      pageTorahRefs = [...chunk.torahMarkers]
      pageStoryRefs = [...chunk.storyMarkers]
      chunk.torahMarkers.forEach(m => { if (!refPageMap.has(m)) refPageMap.set(m, pageNum) })
      chunk.storyMarkers.forEach(m => { if (!refPageMap.has(m)) refPageMap.set(m, pageNum) })
      chunkIdx++
    }

    // ── Final footnote fit for committed chunks ───────────────────────────────
    const finalTorah = collectNotes(pageTorahRefs, torahFootnotes, pendingTorah)
    const finalStory = collectNotes(pageStoryRefs, storyFootnotes, pendingStory)
    const mainH = measureMainHtml(joinChunks(pageChunks))
    const spacer = finalTorah.length || finalStory.length ? MAIN_FOOT_SPACER : 0
    const finalFit = fitFootnotes(finalTorah, finalStory, avail - mainH - spacer)

    overflowTorah = finalFit.torahOverflow
    overflowStory = finalFit.storyOverflow

    // Chapter metadata from first chunk on this page
    const fc = pageChunks[0]
    const chapterMeta = fc?.isFirstInChapter
      ? { chapterNumber: fc.chapterNumber, chapterTitle: fc.chapterTitle, subtitle: fc.subtitle }
      : {}

    pages.push(makePage(pageNum, pageChunks, chapterMeta, headerH, finalFit, mainH))
  }

  // Fill totalPages
  const total = pages.length
  pages.forEach(p => (p.totalPages = total))

  // Build spreads (RTL: odd pages on right, even on left)
  const spreads: SpreadData[] = []
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      spreadIndex: spreads.length,
      right: pages[i] ?? null,
      left: pages[i + 1] ?? null,
    })
  }

  return { title, pages, spreads }
}

function makePage(
  pageNum: number,
  chunks: TextChunk[],
  meta: { chapterNumber?: string; chapterTitle?: string; subtitle?: string },
  headerH: number,
  fit: FitResult,
  measuredMainH: number     // actual DOM-measured height of main text content
): PageData {
  const mainHtml = joinChunks(chunks)
  return {
    pageNumber: pageNum,
    totalPages: 0,
    chapterNumber: meta.chapterNumber,
    chapterTitle: meta.chapterTitle,
    subtitle: meta.subtitle,
    calculatedHeaderHeight: headerH,
    calculatedMainHeight: measuredMainH,   // exact content height — no blank gap
    mainSections: mainHtml
      ? [{ id: `pg-${pageNum}`, htmlContent: mainHtml, isHeading: false }]
      : [],
    torahFootnotes: fit.torahFitted,
    storyFootnotes: fit.storyFitted,
    footnotesLayout: fit.layout,
  }
}
