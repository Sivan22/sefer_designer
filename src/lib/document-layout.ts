import type { PageData, SpreadData, ParsedDocument, FootnoteItem, FootnotesLayout } from '@/types/document'
import type { ParsedDocx, TextChunk } from './mammoth-parser'

// ── Page geometry (matches CSS custom properties; mirrors example.pdf trim
// 523.89 × 733.654 pt converted to CSS px at 96 DPI) ─────────────────────────
const PAGE_H        = 978.21    // 733.654 pt
const PAGE_W        = 698.52    // 523.89 pt
const MARGIN_T      = 111       // ~83 pt — top of running header
const MARGIN_B      = 96        // ~72 pt
const MARGIN_I      = 99        // ~74 pt
const MARGIN_O      = 99        // ~74 pt
const CONTENT_W     = PAGE_W - MARGIN_I - MARGIN_O   // 500.52
const CONTENT_H     = PAGE_H - MARGIN_T - MARGIN_B   // 771.21

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP           = 24     // gap between dual footnote columns
const COL_W             = (CONTENT_W - COL_GAP) / 2  // ≈ 238.26 px
const MIN_COL_H         = 20     // min px to bother rendering columns
const RUNNING_HEADER_H  = 72     // running-title strip at the top of every page
const CHAPTER_NUM_H     = 60     // chapter number block (e.g. "פרק ד")
const CHAPTER_TITLE_H   = 50     // chapter title
const CHAPTER_SUB_H     = 38     // chapter subtitle
const COL_HEADER_H      = 50     // column-divider header height
const MAIN_FOOT_SPACER  = 12     // spacer between main text and footnotes
const MAX_PAGES         = 500
const LINE_H            = 24     // approx body line height (12.75pt × 1.4 ≈ 17.85pt = 23.8px)

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
  // Match the rendered body styles in PageSurface (font-vilna, 12.75pt, 1.4)
  el.style.cssText = `width:${CONTENT_W}px;font-family:'PFT Vilna',serif;font-size:12.75pt;line-height:1.4;direction:rtl;unicode-bidi:plaintext`
  el.className = 'main-text'
  el.innerHTML = html
  return measure(el)
}

function noteHtml(f: FootnoteItem, fontClass: string, sizeClass: string): string {
  if (f.isContinuation) {
    return `<div class="${fontClass} ${sizeClass} footnote-item" style="direction:rtl">${f.formattedContent}</div>`
  }
  const isHebrew = /^[א-ת]/.test(f.marker)
  const marker = isHebrew ? `(${f.marker})` : `[${f.marker}]`
  return `<div class="${fontClass} ${sizeClass} footnote-item" style="direction:rtl"><span class="footnote-marker">${marker}</span> ${f.formattedContent}</div>`
}

function itemsHtml(items: FootnoteItem[], fontClass: string, sizeClass: string): string {
  return items.map(f => noteHtml(f, fontClass, sizeClass)).join('')
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

// ── HTML word-split helpers ──────────────────────────────────────────────────

function findWordCharOffset(text: string, wordCount: number): number {
  let words = 0
  let i = 0
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++
    if (i >= text.length) break
    words++
    while (i < text.length && !/\s/.test(text[i])) i++
    if (words === wordCount) return i
  }
  return text.length
}

// Split HTML at `wordCount` plain-text words using the DOM Range API.
// Returns { head, tail } HTML strings. Both share the same markup structure.
function splitHtmlAtWords(html: string, wordCount: number): { head: string; tail: string } {
  if (wordCount <= 0) return { head: '', tail: html }

  const container = document.createElement('div')
  container.innerHTML = html

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let wordsFound = 0

  let node: Text | null
  while ((node = walker.nextNode() as Text | null) !== null) {
    const text = node.textContent!
    const nodeWordCount = text.split(/\s+/).filter(Boolean).length

    if (wordsFound + nodeWordCount >= wordCount) {
      const needed = wordCount - wordsFound
      const charOffset = findWordCharOffset(text, needed)

      // Split this text node in-place; node now holds [0..charOffset)
      node.splitText(charOffset)
      const nextNode = node.nextSibling!

      const headRange = document.createRange()
      headRange.setStart(container, 0)
      headRange.setEndAfter(node)
      const headFrag = headRange.cloneContents()
      const headDiv = document.createElement('div')
      headDiv.appendChild(headFrag)

      const tailRange = document.createRange()
      tailRange.selectNodeContents(container)
      tailRange.setStart(nextNode, 0)
      const tailFrag = tailRange.cloneContents()
      const tailDiv = document.createElement('div')
      tailDiv.appendChild(tailFrag)

      return {
        head: headDiv.innerHTML,
        tail: tailDiv.innerHTML.replace(/^\s+/, ''),
      }
    }
    wordsFound += nodeWordCount
  }

  return { head: html, tail: '' }
}

// Binary-search to find the largest word prefix of `note.formattedContent` that
// renders within `availH` px at the given column width / layout.
// Returns split { head, tail } items, or null if the whole note fits / can't split.
function splitNoteAtHeight(
  note: FootnoteItem,
  availH: number,
  colWidth: number,
  fontClass: string,
  sizeClass: string,
  twoCol: boolean,
): { head: FootnoteItem; tail: FootnoteItem } | null {
  if (availH < MIN_COL_H) return null

  const measureFn = (items: FootnoteItem[]) =>
    twoCol
      ? measureTwoColLayout(items, fontClass, sizeClass)
      : measureColumnItems(items, colWidth, fontClass, sizeClass)

  const fullH = measureFn([note])
  if (fullH <= availH) return null  // fits whole — no split needed

  const tmp = document.createElement('div')
  tmp.innerHTML = note.formattedContent
  const totalWords = (tmp.textContent ?? '').split(/\s+/).filter(Boolean).length
  if (totalWords <= 1) return null   // can't split a single word

  let lo = 1, hi = totalWords - 1, bestCount = 0

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const { head: headHtml } = splitHtmlAtWords(note.formattedContent, mid)
    const h = measureFn([{ ...note, id: note.id + '-h', formattedContent: headHtml }])
    if (h <= availH) { bestCount = mid; lo = mid + 1 }
    else              { hi = mid - 1 }
  }

  if (bestCount === 0) return null

  const { head: headHtml, tail: tailHtml } = splitHtmlAtWords(note.formattedContent, bestCount)
  if (!tailHtml.trim()) return null

  return {
    head: { ...note, id: note.id + '-head', formattedContent: headHtml, isSplitHead: true, isContinuation: false },
    tail: { ...note, id: note.id + '-cont', formattedContent: tailHtml, isContinuation: true, isSplitHead: false },
  }
}

// Greedy fit + multi-note iterative split: each overflow item that can't fit
// whole is split, with its head placed on this page and its tail returned to
// overflow. Space is reserved for subsequent overflow notes (≈1 line each)
// so every note in `notes` ends up with at least its head on this page,
// honouring the Iron Rule. Document order is preserved on overflow.
function fitColumnMulti(
  notes: FootnoteItem[],
  maxH: number,
  colWidth: number,
  fontClass: string,
  sizeClass: string,
  twoCol: boolean,
): { fitted: FootnoteItem[]; overflow: FootnoteItem[] } {
  const measure = (items: FootnoteItem[]) =>
    twoCol
      ? measureTwoColLayout(items, fontClass, sizeClass)
      : measureColumnItems(items, colWidth, fontClass, sizeClass)

  let fitted: FootnoteItem[] = []
  let queue = [...notes]
  const tails: FootnoteItem[] = []

  while (queue.length > 0) {
    const item = queue[0]
    const fittedH = fitted.length ? measure(fitted) : 0
    const remainH = maxH - fittedH
    if (remainH < MIN_COL_H) break

    // Whole-fit if it fits — earlier notes never get split, only the last
    // note that spills off the page is broken. This matches the standard
    // book convention: "only the bottom note spills."
    const candidate = [...fitted, item]
    const candidateH = measure(candidate)
    if (candidateH <= maxH) {
      fitted = candidate
      queue.shift()
      continue
    }

    // This is the spilling note (it doesn't fit whole) — split it so its
    // head appears here and its tail spills to the next page.
    const split = splitNoteAtHeight(item, remainH, colWidth, fontClass, sizeClass, twoCol)
    if (split) {
      fitted = [...fitted, split.head]
      tails.push(split.tail)
      queue.shift()
      // Anything remaining after a split also spills — stop fitting.
      break
    }

    // Could not split (note too short / no prefix fits the remaining space).
    // Force-place if nothing else is fitted, otherwise stop and let it spill.
    if (fitted.length === 0) {
      fitted = [item]
      queue.shift()
    }
    break
  }

  return { fitted, overflow: [...tails, ...queue] }
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
  // Fonts swapped per user request to match example.pdf:
  //   צינור השפע (torah) → Shefa @ 10.5pt
  //   מקור השפע  (story) → Frank @ 9pt
  if (!torah.length || !story.length) {
    const notes    = torah.length ? torah : story
    const fontClass = torah.length ? 'font-shefa' : 'font-frank'
    const sizeClass = torah.length ? 'text-[11.5pt] leading-snug' : 'text-[8pt] leading-relaxed'
    const layout: FootnotesLayout = torah.length ? 'single-torah' : 'single-story'

    const { fitted, overflow } = fitColumnMulti(notes, availForCols, COL_W, fontClass, sizeClass, true)

    const renderedH  = fitted.length ? measureTwoColLayout(fitted, fontClass, sizeClass) : 0
    const totalHeight = fitted.length ? COL_HEADER_H + renderedH : 0
    return {
      torahFitted:  torah.length ? fitted   : [],
      storyFitted:  story.length ? fitted   : [],
      torahOverflow: torah.length ? overflow : [],
      storyOverflow: story.length ? overflow : [],
      totalHeight,
      layout,
    }
  }

  // ── Dual-source ────────────────────────────────────────────────────────────
  const { fitted: tFitted, overflow: tOverflow } =
    fitColumnMulti(torah, availForCols, COL_W, 'font-shefa', 'text-[11.5pt] leading-snug', false)
  const { fitted: sFitted, overflow: sOverflow } =
    fitColumnMulti(story, availForCols, COL_W, 'font-frank', 'text-[8pt] leading-relaxed', false)

  // Measured heights of fitted content determine which column is taller → float direction
  const torahH = measureColumnItems(tFitted, COL_W, 'font-shefa', 'text-[11.5pt] leading-snug')
  const storyH = measureColumnItems(sFitted, COL_W, 'font-frank', 'text-[8pt] leading-relaxed')
  // Always use float layout for dual-source; direction by measured height (torah wins ties)
  const layout: FootnotesLayout = torahH >= storyH ? 'float-torah' : 'float-story'
  const totalHeight = COL_HEADER_H + Math.max(torahH, storyH)

  return { torahFitted: tFitted, storyFitted: sFitted, torahOverflow: tOverflow, storyOverflow: sOverflow, totalHeight, layout }
}

// ── Chunk helpers ─────────────────────────────────────────────────────────────
type ChunkWithMeta = TextChunk & {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  isFirstInChapter: boolean
  // Head of a chunk that was split mid-paragraph because it didn't fit on the
  // page. The merged block element gets a `split-head` class so its last line
  // justifies to the column edge (visual cue that the paragraph continues).
  isSplitHead?: boolean
}

// Merge consecutive sub-chunks from the same source paragraph into a single
// block element so the body reads as one paragraph (no break after sentence
// punctuation). Different paragraphs / headings keep their own elements.
function joinChunks(chunks: ChunkWithMeta[]): string {
  if (chunks.length === 0) return ''
  type Group = { tag: string; cls?: string; parts: string[]; splitHead: boolean }
  const groups: Group[] = []
  let lastParaId = ''
  for (const c of chunks) {
    const paraId = c.paragraphId ?? c.id
    const tag = c.tag ?? 'p'
    const inner = c.innerHtml ?? c.html
    if (paraId === lastParaId && groups.length > 0 && groups[groups.length - 1].tag === tag) {
      const g = groups[groups.length - 1]
      g.parts.push(inner)
      if (c.isSplitHead) g.splitHead = true
    } else {
      groups.push({ tag, cls: c.className, parts: [inner], splitHead: !!c.isSplitHead })
      lastParaId = paraId
    }
  }
  return groups.map(g => {
    const cls = [g.cls, g.splitHead ? 'split-head' : ''].filter(Boolean).join(' ')
    const open = cls ? `<${g.tag} class="${cls}">` : `<${g.tag}>`
    return `${open}${g.parts.join(' ')}</${g.tag}>`
  }).join('\n')
}

// Extract footnote/endnote markers from a piece of body HTML — used after
// word-level splits to recompute which markers belong to each half.
function extractInlineMarkers(html: string): { torah: string[]; story: string[] } {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const torah: string[] = []
  const story: string[] = []
  tmp.querySelectorAll('span.footnote-ref').forEach(span => {
    const raw = span.getAttribute('data-marker')
      ?? (span.textContent?.trim() ?? '').replace(/^[\[\(]|[\]\)]$/g, '')
    if (/^[א-ת]/.test(raw)) torah.push(raw)
    else if (/^\d+$/.test(raw)) story.push(raw)
  })
  return { torah, story }
}

function wrapInTag(tag: string, cls: string | undefined, innerHtml: string): string {
  return cls ? `<${tag} class="${cls}">${innerHtml}</${tag}>` : `<${tag}>${innerHtml}</${tag}>`
}

function collectNotes(
  markers: string[],
  noteMap: Map<string, FootnoteItem>,
  pending: FootnoteItem[]
): FootnoteItem[] {
  // Check by both id and marker: pending may hold a continuation tail (-cont)
  // of a note whose marker appears in the new refs — don't add the original again
  const pendingIds = new Set(pending.map(n => n.id))
  const pendingMarkers = new Set(pending.map(n => n.marker))
  const newNotes: FootnoteItem[] = []
  for (const m of markers) {
    const note = noteMap.get(m)
    if (note && !pendingIds.has(note.id) && !pendingMarkers.has(note.marker)) {
      newNotes.push(note)
      pendingIds.add(note.id)
      pendingMarkers.add(note.marker)
    }
  }
  // Spec Rule 4: spilled notes drain BEFORE new notes are introduced.
  // Pending continuations sit at the TOP of the notes zone; new notes follow.
  return [...pending, ...newNotes]
}

// Word-level split of a body chunk: find the largest word-prefix whose head
// fits on the current page (body+notes geometry) without violating the Iron
// Rule. Returns { head, tail } chunks, or null if no valid split exists.
// Headings are never split. The tail keeps the same paragraphId so a later
// page joins it as its own continuing paragraph.
//
// `maxBodyH` caps the body height (set by user override or default geometry);
// `avail` is the total page space used for fitting notes alongside the head.
function splitChunkAtHeight(
  chunk: ChunkWithMeta,
  pageChunks: ChunkWithMeta[],
  pendingTorah: FootnoteItem[],
  pendingStory: FootnoteItem[],
  priorTorahRefs: string[],
  priorStoryRefs: string[],
  maxBodyH: number,
  avail: number,
  torahMap: Map<string, FootnoteItem>,
  storyMap: Map<string, FootnoteItem>,
): { head: ChunkWithMeta; tail: ChunkWithMeta } | null {
  if (chunk.isHeading) return null
  const inner = chunk.innerHtml ?? ''
  if (!inner.trim()) return null
  const tmp = document.createElement('div')
  tmp.innerHTML = inner
  const totalWords = (tmp.textContent ?? '').split(/\s+/).filter(Boolean).length
  if (totalWords <= 1) return null

  let bestN = 0
  let bestHeadHtml = ''
  let bestTailHtml = ''

  let lo = 1, hi = totalWords - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const { head: headHtml, tail: tailHtml } = splitHtmlAtWords(inner, mid)
    if (!headHtml.trim() || !tailHtml.trim()) { hi = mid - 1; continue }
    const headMarkers = extractInlineMarkers(headHtml)
    const headChunk: ChunkWithMeta = {
      ...chunk,
      innerHtml: headHtml,
      html: wrapInTag(chunk.tag, chunk.className, headHtml),
      torahMarkers: headMarkers.torah,
      storyMarkers: headMarkers.story,
    }
    const candidateMainH = measureMainHtml(joinChunks([...pageChunks, headChunk]))
    if (candidateMainH > maxBodyH) { hi = mid - 1; continue }
    const trialTorahRefs = [...priorTorahRefs, ...headMarkers.torah]
    const trialStoryRefs = [...priorStoryRefs, ...headMarkers.story]
    const trialTorah = collectNotes(trialTorahRefs, torahMap, pendingTorah)
    const trialStory = collectNotes(trialStoryRefs, storyMap, pendingStory)
    const trialSpacer = trialTorah.length || trialStory.length ? MAIN_FOOT_SPACER : 0
    const trialFit = fitFootnotes(trialTorah, trialStory, avail - candidateMainH - trialSpacer)
    const fittedSet = new Set([
      ...trialFit.torahFitted.map(n => n.marker),
      ...trialFit.storyFitted.map(n => n.marker),
    ])
    const ironOk = [...trialTorahRefs, ...trialStoryRefs].every(m => fittedSet.has(m))
    if (ironOk) {
      bestN = mid
      bestHeadHtml = headHtml
      bestTailHtml = tailHtml
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (bestN === 0) return null

  const headMarkers = extractInlineMarkers(bestHeadHtml)
  const tailMarkers = extractInlineMarkers(bestTailHtml)
  const head: ChunkWithMeta = {
    ...chunk,
    id: chunk.id + '-h',
    innerHtml: bestHeadHtml,
    html: wrapInTag(chunk.tag, chunk.className, bestHeadHtml),
    torahMarkers: headMarkers.torah,
    storyMarkers: headMarkers.story,
    isSplitHead: true,
  }
  const tail: ChunkWithMeta = {
    ...chunk,
    id: chunk.id + '-t',
    innerHtml: bestTailHtml,
    html: wrapInTag(chunk.tag, chunk.className, bestTailHtml),
    torahMarkers: tailMarkers.torah,
    storyMarkers: tailMarkers.story,
    isFirstInChapter: false,
    chapterNumber: undefined,
    chapterTitle: undefined,
    subtitle: undefined,
    isSplitHead: false,
  }
  return { head, tail }
}

// ── Main layout function ──────────────────────────────────────────────────────
export interface LayoutOptions {
  /**
   * Per-page user override of the maximum body height (in px). When set, the
   * layout engine caps body content for that page at this height; notes (and
   * downstream pages) absorb the rest. Keys are 1-based page numbers as
   * produced by the previous layout pass.
   */
  bodyHeightOverrides?: Map<number, number>
}

export async function layoutDocument(
  parsed: ParsedDocx,
  options: LayoutOptions = {},
): Promise<ParsedDocument> {
  await preloadFonts()
  const { title, chapters, torahFootnotes, storyFootnotes } = parsed
  const overrides = options.bodyHeightOverrides

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
  // Active chapter info — used to populate the running header on every page
  // of the chapter, not just the chapter's first page.
  let activeChapterInfo: string | undefined

  while (chunkIdx < allChunks.length || overflowTorah.length > 0 || overflowStory.length > 0) {
    const pageNum = pages.length + 1
    if (pageNum > MAX_PAGES) break

    // Chapter header on this page?
    const firstChunk = allChunks[chunkIdx]
    const hasChapterHeader =
      !!firstChunk?.isFirstInChapter &&
      !!(firstChunk?.chapterNumber || firstChunk?.chapterTitle)
    const chapterH = hasChapterHeader
      ? (firstChunk?.chapterNumber ? CHAPTER_NUM_H : 0) +
        (firstChunk?.chapterTitle  ? CHAPTER_TITLE_H : 0) +
        (firstChunk?.subtitle      ? CHAPTER_SUB_H : 0)
      : 0
    const headerH = RUNNING_HEADER_H + chapterH
    const avail = CONTENT_H - headerH

    // Body-height cap: user override (if set for this page) clamped to [0, avail],
    // else the natural geometry (avail minus a minimum reservation for notes).
    const overrideH = overrides?.get(pageNum)
    const bodyCap = overrideH !== undefined
      ? Math.max(0, Math.min(overrideH, avail))
      : Math.max(0, avail - MIN_COL_H)

    // Start with overflow from previous page
    const pendingTorah = [...overflowTorah]
    const pendingStory = [...overflowStory]
    overflowTorah = []
    overflowStory = []

    // ── Inner chunk accumulation — "trial-fail" algorithm ────────────────────
    // Start with 0 body text. Fit all notes (pending overflow + refs from each
    // new chunk) in remaining space. Keep adding chunks until white space < 1 line.
    const pageChunks: ChunkWithMeta[] = []
    let pageTorahRefs: string[] = []
    let pageStoryRefs: string[] = []
    let mainH = 0

    while (true) {
      // ① How much space do the current footnotes need?
      const allTorah = collectNotes(pageTorahRefs, torahFootnotes, pendingTorah)
      const allStory = collectNotes(pageStoryRefs, storyFootnotes, pendingStory)
      const hasNotes = allTorah.length > 0 || allStory.length > 0
      const spacer   = hasNotes ? MAIN_FOOT_SPACER : 0
      const fit      = fitFootnotes(allTorah, allStory, avail - mainH - spacer)
      const footH    = fit.totalHeight
      const whiteSpace = avail - mainH - footH - spacer

      // ② Page is tight (< 1 line of white space) → stop
      if (whiteSpace < LINE_H) break
      // Body has reached its (default or user-overridden) cap → stop
      if (mainH >= bodyCap) break

      // ③ Try to add the next chunk
      if (chunkIdx >= allChunks.length) break
      const chunk = allChunks[chunkIdx]
      const newMainH = measureMainHtml(joinChunks([...pageChunks, chunk]))
      const fitsHeight = newMainH <= bodyCap

      // ③.5 Iron Rule check — every marker introduced on THIS page must have
      // its note's head present in the fit. Adding more body shrinks the notes
      // zone, which can push an earlier marker's note out — so re-check ALL
      // accumulated new markers, not just this chunk's.
      let ironOk = false
      let trialTorahRefs: string[] = []
      let trialStoryRefs: string[] = []
      if (fitsHeight) {
        trialTorahRefs = [...pageTorahRefs, ...chunk.torahMarkers]
        trialStoryRefs = [...pageStoryRefs, ...chunk.storyMarkers]
        const trialTorah = collectNotes(trialTorahRefs, torahFootnotes, pendingTorah)
        const trialStory = collectNotes(trialStoryRefs, storyFootnotes, pendingStory)
        const trialSpacer = trialTorah.length || trialStory.length ? MAIN_FOOT_SPACER : 0
        const trialFit = fitFootnotes(trialTorah, trialStory, avail - newMainH - trialSpacer)
        const fittedMarkerSet = new Set([
          ...trialFit.torahFitted.map(n => n.marker),
          ...trialFit.storyFitted.map(n => n.marker),
        ])
        const allNewMarkers = [...trialTorahRefs, ...trialStoryRefs]
        ironOk = allNewMarkers.every(m => fittedMarkerSet.has(m))
      }

      if (fitsHeight && ironOk) {
        // ④ Accept whole chunk
        pageChunks.push(chunk)
        pageTorahRefs = trialTorahRefs
        pageStoryRefs = trialStoryRefs
        mainH = newMainH
        chunkIdx++
        continue
      }

      // ⑤ Whole chunk doesn't fit (either too tall, or its markers' notes
      // can't fit alongside everything else). Try a word-level split — place
      // the largest valid prefix here and leave the tail for the next page.
      const split = splitChunkAtHeight(
        chunk, pageChunks, pendingTorah, pendingStory,
        pageTorahRefs, pageStoryRefs, bodyCap, avail,
        torahFootnotes, storyFootnotes,
      )
      if (split) {
        pageChunks.push(split.head)
        pageTorahRefs = [...pageTorahRefs, ...split.head.torahMarkers]
        pageStoryRefs = [...pageStoryRefs, ...split.head.storyMarkers]
        mainH = measureMainHtml(joinChunks(pageChunks))
        allChunks[chunkIdx] = split.tail
      }
      break
    }

    // Force at least one chunk to avoid infinite loop — UNLESS pending notes exist
    // (in which case we emit a notes-only page to drain them first, then retry on next page).
    const hasPending = pendingTorah.length > 0 || pendingStory.length > 0
    if (pageChunks.length === 0 && chunkIdx < allChunks.length && !hasPending) {
      const chunk = allChunks[chunkIdx]
      pageChunks.push(chunk)
      pageTorahRefs = [...chunk.torahMarkers]
      pageStoryRefs = [...chunk.storyMarkers]
      mainH = measureMainHtml(joinChunks(pageChunks))
      chunkIdx++
    }

    // ── Final footnote fit (mainH already measured in the loop) ─────────────────
    const finalTorah = collectNotes(pageTorahRefs, torahFootnotes, pendingTorah)
    const finalStory = collectNotes(pageStoryRefs, storyFootnotes, pendingStory)
    const spacer = finalTorah.length || finalStory.length ? MAIN_FOOT_SPACER : 0
    const finalFit = fitFootnotes(finalTorah, finalStory, avail - mainH - spacer)

    overflowTorah = finalFit.torahOverflow
    overflowStory = finalFit.storyOverflow

    // Chapter metadata from first chunk on this page
    const fc = pageChunks[0]
    const chapterMeta = fc?.isFirstInChapter
      ? { chapterNumber: fc.chapterNumber, chapterTitle: fc.chapterTitle, subtitle: fc.subtitle }
      : {}

    // Update the running chapter context when we encounter a new chapter on
    // this page. Subsequent pages reuse the same activeChapterInfo until the
    // next chapter starts.
    if (fc?.isFirstInChapter && (fc.chapterNumber || fc.chapterTitle)) {
      activeChapterInfo = fc.chapterTitle
        ? `${fc.chapterNumber ?? ''}${fc.chapterNumber && fc.chapterTitle ? ': ' : ''}${fc.chapterTitle}`
        : fc.chapterNumber
    }

    pages.push(makePage(pageNum, pageChunks, chapterMeta, headerH, finalFit, mainH, activeChapterInfo))
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
  measuredMainH: number,
  runningChapterInfo?: string,
): PageData {
  const mainHtml = joinChunks(chunks)
  return {
    pageNumber: pageNum,
    totalPages: 0,
    chapterNumber: meta.chapterNumber,
    chapterTitle: meta.chapterTitle,
    subtitle: meta.subtitle,
    runningChapterInfo,
    calculatedHeaderHeight: headerH,
    calculatedMainHeight: measuredMainH,
    mainSections: mainHtml
      ? [{ id: `pg-${pageNum}`, htmlContent: mainHtml, isHeading: false }]
      : [],
    torahFootnotes: fit.torahFitted,
    storyFootnotes: fit.storyFitted,
    footnotesLayout: fit.layout,
  }
}
