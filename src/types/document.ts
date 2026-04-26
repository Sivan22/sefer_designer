export type ViewMode = 'page' | 'spread'
export type ExportStage = 'idle' | 'preparing' | 'uploading' | 'processing' | 'downloading' | 'saving' | 'done'
export type FootnotesLayout = 'none' | 'single-torah' | 'single-story' | 'grid' | 'float'

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
