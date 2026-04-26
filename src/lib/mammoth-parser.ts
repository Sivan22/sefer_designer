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

// ── Split a paragraph element into sentence-level chunks ─────────────────────
function chunkParagraph(node: HTMLElement, prefix: string): TextChunk[] {
  const tag = node.tagName.toLowerCase()
  const isHeading = /^h[1-6]$/.test(tag)
  const inner = node.innerHTML.trim()
  if (!inner) return []

  // Don't split headings
  if (isHeading) {
    return [{
      id: `${prefix}-0`,
      html: `<${tag}>${inner}</${tag}>`,
      torahMarkers: collectMarkers(node, 'torah'),
      storyMarkers: collectMarkers(node, 'story'),
      isHeading: true,
    }]
  }

  // Split at sentence-ending punctuation
  const SENTENCE_END = /([.!?:;׃]\s+|[.!?:;׃]$)/g
  const parts: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = SENTENCE_END.exec(inner)) !== null) {
    parts.push(inner.slice(last, m.index + m[0].length))
    last = m.index + m[0].length
  }
  if (last < inner.length) parts.push(inner.slice(last))

  const chunks: TextChunk[] = []
  parts.forEach((part, idx) => {
    const trimmed = part.trim()
    if (!trimmed) return
    const wrapper = document.createElement(tag)
    wrapper.innerHTML = trimmed
    chunks.push({
      id: `${prefix}-${idx}`,
      html: `<${tag}>${trimmed}</${tag}>`,
      torahMarkers: collectMarkers(wrapper, 'torah'),
      storyMarkers: collectMarkers(wrapper, 'story'),
      isHeading: false,
    })
  })

  return chunks.length
    ? chunks
    : [{ id: `${prefix}-0`, html: `<${tag}>${inner}</${tag}>`, torahMarkers: collectMarkers(node, 'torah'), storyMarkers: collectMarkers(node, 'story'), isHeading: false }]
}

function collectMarkers(el: Element, type: 'torah' | 'story'): string[] {
  const markers: string[] = []
  el.querySelectorAll('span.footnote-ref').forEach(span => {
    const m = span.textContent?.trim() ?? ''
    if (type === 'torah' && /^[א-ת]/.test(m)) markers.push(m)
    else if (type === 'story' && /^\d+$/.test(m)) markers.push(m)
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
    span.textContent = marker

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
      continue
    }

    if (!current) {
      if (!title) title = text
      current = { chunks: [] }
      chapters.push(current)
      chapterIdx++
    }

    if (isHeading) {
      current.chunks.push({
        id: `c${chapterIdx}-h-${current.chunks.length}`,
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
