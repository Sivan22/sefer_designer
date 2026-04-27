import mammoth from 'mammoth'
import type { FootnoteItem } from '@/types/document'

// ── Hebrew marker helpers ─────────────────────────────────────────────────────
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'
function hebrewOrdinal(n: number): string {
  if (n >= 1 && n <= 22) return HEBREW_LETTERS[n - 1]
  if (n >= 23 && n <= 44) return HEBREW_LETTERS[Math.floor((n - 1) / 22)] + HEBREW_LETTERS[(n - 1) % 22]
  return `(${n})`
}

// ── Exported types ────────────────────────────────────────────────────────────
export interface TextChunk {
  id: string
  // Identifies the source paragraph. Sub-chunks created by sentence-splitting
  // share the same paragraphId so the layout engine can re-merge them into
  // a single <p> at render time (no visual break after sentence punctuation).
  paragraphId: string
  // Block tag of the source element ("p", "h1", etc.).
  tag: string
  // Optional CSS class on the rebuilt block element.
  className?: string
  // Inline HTML *inside* the block tag — what to concatenate when several
  // sub-chunks from one paragraph end up on the same page.
  innerHtml: string
  // Full block-level HTML (`<tag>innerHtml</tag>`) — kept for measurement.
  html: string
  torahMarkers: string[]   // Hebrew-letter markers (endnote refs)
  storyMarkers: string[]   // Numeric markers (footnote refs)
  isHeading: boolean
}

export interface ParsedChapter {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  chunks: TextChunk[]
}

export interface ParsedDocx {
  title: string
  chapters: ParsedChapter[]
  torahFootnotes: Map<string, FootnoteItem>   // Hebrew-letter marker → endnote
  storyFootnotes: Map<string, FootnoteItem>   // Numeric marker → footnote
}

// ── Walk up to find outermost <sup> ancestor ─────────────────────────────────
function outermostSup(el: Element): Element {
  let cur: Element = el
  while (cur.parentElement && cur.parentElement.tagName === 'SUP') cur = cur.parentElement
  return cur
}

// ── Extract text content from a <li> body, stripping back-reference links ────
function extractBodyHtml(li: Element): string {
  const clone = li.cloneNode(true) as Element
  // Remove back-reference arrows (↑ links)
  clone.querySelectorAll('a[href^="#endnote-ref-"], a[href^="#footnote-ref-"]').forEach(a => a.remove())
  const paragraphs = Array.from(clone.querySelectorAll('p'))
  if (paragraphs.length) {
    return paragraphs.map(p => p.innerHTML.trim()).filter(Boolean).join(' ')
  }
  return clone.innerHTML.trim()
}

// Split a paragraph into sentence-level chunks so the layout engine can place
// each sub-chunk independently — essential for honouring the Iron Rule
// (every marker's note must START on the marker's page). Long paragraphs with
// many markers get split at sentence-end punctuation, giving each marker a
// chance to land on a page where its note can fit.
function chunkParagraph(node: HTMLElement, prefix: string): TextChunk[] {
  const tag = node.tagName.toLowerCase()
  const isHeading = /^h[1-6]$/.test(tag)
  const inner = node.innerHTML.trim()
  if (!inner) return []

  // Detect a "sub-section topic header" — a paragraph that is wholly bold
  // and ends with a colon, used in the source as a mini-headline above the
  // next body paragraph (matches example.pdf style).
  const isTopic =
    !isHeading &&
    tag === 'p' &&
    /:\s*$/.test(node.textContent ?? '') &&
    Array.from(node.childNodes).every(c =>
      (c.nodeType === 3 && !(c.textContent ?? '').trim()) ||
      (c.nodeType === 1 && (c as Element).tagName.toLowerCase() === 'strong')
    )

  const wrap = (innerHtml: string): string =>
    isTopic
      ? `<${tag} class="topic-header">${innerHtml}</${tag}>`
      : `<${tag}>${innerHtml}</${tag}>`

  const wholeChunk = (): TextChunk => ({
    id: `${prefix}-0`,
    paragraphId: prefix,
    tag,
    className: isTopic ? 'topic-header' : undefined,
    innerHtml: inner,
    html: wrap(inner),
    torahMarkers: collectMarkers(node, 'torah'),
    storyMarkers: collectMarkers(node, 'story'),
    isHeading,
  })

  if (isHeading) return [wholeChunk()]

  // Split at sentence-end punctuation: . ! ? ; ׃ (Hebrew sof-pasuq).
  // The split runs on the raw HTML — sentence punctuation typically sits
  // outside <span class="footnote-ref">…</span> wrappers, so this is safe.
  // We require each candidate sub-chunk to have at least MIN_WORDS_PER_CHUNK
  // words; shorter pieces (e.g. "א.", "ב.") are merged forward so that
  // section markers don't end up as their own paragraphs.
  const MIN_WORDS_PER_CHUNK = 5
  const SENTENCE_END = /([.!?;׃]\s+|[.!?;׃]$)/g
  const candidates: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = SENTENCE_END.exec(inner)) !== null) {
    candidates.push(inner.slice(last, m.index + m[0].length))
    last = m.index + m[0].length
  }
  if (last < inner.length) candidates.push(inner.slice(last))
  if (candidates.length <= 1) return [wholeChunk()]

  // Merge tiny pieces forward — accumulate into `pending` until min word count.
  const merged: string[] = []
  let pending = ''
  for (const part of candidates) {
    pending += part
    const tmp = document.createElement('div')
    tmp.innerHTML = pending
    const wc = (tmp.textContent ?? '').split(/\s+/).filter(Boolean).length
    if (wc >= MIN_WORDS_PER_CHUNK) { merged.push(pending); pending = '' }
  }
  if (pending) {
    if (merged.length > 0) merged[merged.length - 1] += pending
    else merged.push(pending)
  }
  if (merged.length <= 1) return [wholeChunk()]

  const chunks: TextChunk[] = []
  merged.forEach((part, idx) => {
    const trimmed = part.trim()
    if (!trimmed) return
    const wrapper = document.createElement(tag)
    wrapper.innerHTML = trimmed
    chunks.push({
      id: `${prefix}-${idx}`,
      paragraphId: prefix,
      tag,
      className: isTopic ? 'topic-header' : undefined,
      innerHtml: trimmed,
      html: wrap(trimmed),
      torahMarkers: collectMarkers(wrapper, 'torah'),
      storyMarkers: collectMarkers(wrapper, 'story'),
      isHeading: false,
    })
  })
  return chunks.length ? chunks : [wholeChunk()]
}

function collectMarkers(el: Element, type: 'torah' | 'story'): string[] {
  const markers: string[] = []
  el.querySelectorAll('span.footnote-ref').forEach(span => {
    // The visible text is wrapped in brackets like "[סט]"; the raw marker
    // ("סט", "12") is stashed on the data-marker attribute.
    const raw = span.getAttribute('data-marker')
      ?? (span.textContent?.trim() ?? '').replace(/^\[|\]$/g, '')
    if (type === 'torah' && /^[א-ת]/.test(raw)) markers.push(raw)
    else if (type === 'story' && /^\d+$/.test(raw)) markers.push(raw)
  })
  return markers
}

// ── Main parse entry point ────────────────────────────────────────────────────
export async function parseDocx(buffer: ArrayBuffer): Promise<ParsedDocx> {
  // 1. Convert docx → HTML (mammoth puts footnote/endnote bodies at the end)
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer })

  // 2. Parse into DOM
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 3. Find all inline refs (endnotes and footnotes) in document order
  //    Endnotes: <sup><a href="#endnote-N">…</a></sup>  → Torah, Hebrew-letter markers
  //    Footnotes: <sup><a href="#footnote-N">…</a></sup> → Story, numeric markers
  let enSeq = 0
  let fnSeq = 0
  const enIdToMarker = new Map<string, string>()  // endnote-N → Hebrew letter
  const fnIdToMarker = new Map<string, string>()  // footnote-N → number

  // Collect all inline ref anchors in document order (snapshot before mutations)
  const inlineAnchors = Array.from(
    doc.querySelectorAll('sup a[href^="#endnote-"], sup a[href^="#footnote-"]')
  ) as HTMLAnchorElement[]

  // Assign markers
  for (const a of inlineAnchors) {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('#endnote-')) {
      const id = href.slice('#endnote-'.length)
      if (!enIdToMarker.has(id)) { enSeq++; enIdToMarker.set(id, hebrewOrdinal(enSeq)) }
    } else if (href.startsWith('#footnote-')) {
      const id = href.slice('#footnote-'.length)
      if (!fnIdToMarker.has(id)) { fnSeq++; fnIdToMarker.set(id, String(fnSeq)) }
    }
  }

  // 4. Replace inline <sup> refs with styled <span class="footnote-ref">
  for (const a of inlineAnchors) {
    const href = a.getAttribute('href') ?? ''
    let marker: string | undefined
    if (href.startsWith('#endnote-')) {
      marker = enIdToMarker.get(href.slice('#endnote-'.length))
    } else if (href.startsWith('#footnote-')) {
      marker = fnIdToMarker.get(href.slice('#footnote-'.length))
    }
    if (!marker) continue

    const span = doc.createElement('span')
    span.className = 'footnote-ref'
    span.setAttribute('data-marker', marker)
    // Match example.pdf bracket convention: numeric footnote refs use square
    // brackets `[X]`; Hebrew-letter endnote refs use parentheses `(X)`.
    const isHebrew = /^[א-ת]/.test(marker)
    span.textContent = isHebrew ? `(${marker})` : `[${marker}]`

    const sup = outermostSup(a)
    sup.parentNode?.replaceChild(span, sup)
  }

  // 5. Extract endnote/footnote bodies from <li> elements
  const torahFootnotes = new Map<string, FootnoteItem>()
  const storyFootnotes = new Map<string, FootnoteItem>()

  doc.querySelectorAll('li[id^="endnote-"]').forEach(li => {
    const id = li.id.slice('endnote-'.length)
    const marker = enIdToMarker.get(id)
    if (!marker) return
    const content = extractBodyHtml(li as Element)
    if (content) torahFootnotes.set(marker, { id: `en-${id}`, marker, formattedContent: content })
  })

  doc.querySelectorAll('li[id^="footnote-"]').forEach(li => {
    const id = li.id.slice('footnote-'.length)
    const marker = fnIdToMarker.get(id)
    if (!marker) return
    const content = extractBodyHtml(li as Element)
    if (content) storyFootnotes.set(marker, { id: `fn-${id}`, marker, formattedContent: content })
  })

  // 6. Remove footnote/endnote <ol> lists from the main body
  doc.querySelectorAll('ol').forEach(ol => {
    if (ol.querySelector('li[id^="endnote-"], li[id^="footnote-"]')) ol.remove()
  })

  // 7. Parse body into chapters + chunks
  const nodes = Array.from(doc.body.childNodes).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  )

  const chapters: ParsedChapter[] = []
  let current: ParsedChapter | null = null
  let title = ''
  let chapterIdx = 0

  // A bold-only centered paragraph immediately following the chapter marker
  // is treated as the chapter title; a second one becomes the subtitle.
  // Heuristic: <p><strong>…</strong></p> with no other text, or an h1/h2.
  const isPureBold = (node: HTMLElement): boolean => {
    if (node.tagName.toLowerCase() !== 'p') return false
    const children = Array.from(node.childNodes)
    if (children.length === 0) return false
    return children.every(c =>
      (c.nodeType === 3 && !(c.textContent ?? '').trim()) ||
      (c.nodeType === 1 && (c as Element).tagName.toLowerCase() === 'strong')
    )
  }

  let chapterMetaSlots = 0  // 0 = expecting title, 1 = expecting subtitle, 2 = done

  for (const node of nodes) {
    const text = node.textContent?.trim() ?? ''
    if (!text) continue

    const tag = node.tagName.toLowerCase()
    const isHeading = /^h[1-6]$/.test(tag)

    // Chapter detection: h1-h6 OR any element whose full text matches "פרק XX"
    const isChapter = (isHeading || tag === 'p') && /^פרק\s+[א-ת0-9]+/.test(text)

    if (isChapter) {
      const m = text.match(/פרק\s+([א-ת0-9]+)/)
      current = { chapterNumber: m ? `פרק ${m[1]}` : text, chunks: [] }
      chapters.push(current)
      chapterIdx++
      chapterMetaSlots = 0
      continue
    }

    // Capture chapter title / subtitle if we just saw a chapter header.
    // Slot 0 → chapterTitle, slot 1 → subtitle. Stop on first non-pure-bold or h-tag.
    if (current && chapterMetaSlots < 2 && !current.chunks.length) {
      if (isPureBold(node) || tag === 'h1') {
        if (chapterMetaSlots === 0) current.chapterTitle = text
        else                         current.subtitle = text
        chapterMetaSlots++
        continue
      }
      chapterMetaSlots = 2  // anything else closes the meta region
    }

    if (!current) {
      if (!title) title = text
      current = { chunks: [] }
      chapters.push(current)
      chapterIdx++
    }

    if (isHeading) {
      const hId = `c${chapterIdx}-h-${current.chunks.length}`
      current.chunks.push({
        id: hId,
        paragraphId: hId,
        tag,
        innerHtml: node.innerHTML,
        html: node.outerHTML,
        torahMarkers: collectMarkers(node, 'torah'),
        storyMarkers: collectMarkers(node, 'story'),
        isHeading: true,
      })
    } else {
      const sub = chunkParagraph(node, `c${chapterIdx}-p${current.chunks.length}`)
      current.chunks.push(...sub)
    }
  }

  return {
    title: title || 'מסמך',
    chapters: chapters.filter(c => c.chunks.length > 0),
    torahFootnotes,
    storyFootnotes,
  }
}
