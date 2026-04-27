export type ViewMode = 'page' | 'spread'
export type ExportStage = 'idle' | 'preparing' | 'uploading' | 'processing' | 'downloading' | 'saving' | 'done'
export type FootnotesLayout = 'none' | 'single-torah' | 'single-story' | 'grid' | 'float-torah' | 'float-story'

export interface ExportStatus {
  status: string
  stage: ExportStage
  progress?: number
}

export interface FootnoteItem {
  id: string
  marker: string
  formattedContent: string
  isSource?: boolean
  isContinuation?: boolean  // tail of a split note — no marker shown
}

export interface PageSection {
  id: string
  htmlContent: string
  isHeading?: boolean
}

export interface PageData {
  pageNumber: number
  totalPages: number
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  // Running-header text describing the current chapter, shown on every page
  // of that chapter (not just the first). Populated from the active chapter
  // context as the document is paginated.
  runningChapterInfo?: string
  calculatedHeaderHeight: number
  calculatedMainHeight: number
  mainSections: PageSection[]
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
  footnotesLayout: FootnotesLayout
  showMarginGuide?: boolean
}

export interface SpreadData {
  spreadIndex: number
  left: PageData | null
  right: PageData | null
}

export interface ParsedDocument {
  title: string
  pages: PageData[]
  spreads: SpreadData[]
}
