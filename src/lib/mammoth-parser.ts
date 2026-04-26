import mammoth from 'mammoth'
import { FootnoteItem, PageSection } from '@/types/document'

export interface ParsedChapter {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  paragraphs: PageSection[]
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
}

// Hebrew letter map for footnote markers
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'
function hebrewOrdinal(n: number): string {
  if (n <= 22) return HEBREW_LETTERS[n - 1]
  return String(n)
}

function isChapterLine(text: string): boolean {
  return /^פרק\s+[א-ת0-9]+/.test(text.trim())
}

function extractChapterNumber(text: string): string {
  const m = text.match(/פרק\s+([א-ת0-9]+)/)
  return m ? `פרק ${m[1]}` : ''
}

export async function parseDocx(buffer: ArrayBuffer): Promise<{
  title: string
  chapters: ParsedChapter[]
}> {
  // Use mammoth to get raw HTML + messages
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='footnote text'] => p:fresh",
        "r[style-name='footnote reference'] => sup",
      ],
    }
  )

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(doc.body.childNodes)

  const chapters: ParsedChapter[] = []
  let current: ParsedChapter | null = null
  let footnoteCounter = 0
  let title = ''

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const text = node.textContent?.trim() ?? ''
    if (!text) continue

    const tag = node.tagName.toLowerCase()
    const isHeading = /^h[1-6]$/.test(tag)

    if (isHeading && isChapterLine(text)) {
      current = {
        chapterNumber: extractChapterNumber(text),
        paragraphs: [],
        torahFootnotes: [],
        storyFootnotes: [],
      }
      chapters.push(current)
      continue
    }

    if (!current) {
      if (!title && text) title = text
      current = { paragraphs: [], torahFootnotes: [], storyFootnotes: [] }
      chapters.push(current)
    }

    // Check for footnote sup references and replace with styled spans
    const sups = node.querySelectorAll('sup')
    sups.forEach((sup, _i) => {
      footnoteCounter++
      const marker = hebrewOrdinal(footnoteCounter)
      sup.outerHTML = `<span class="footnote-ref">${marker}</span>`
    })

    current.paragraphs.push({
      id: `p-${chapters.length}-${current.paragraphs.length}`,
      htmlContent: node.outerHTML,
      isHeading,
    })
  }

  return { title: title || 'מסמך', chapters }
}
