import { PageData } from '@/types/document'
import { PageSurface } from './PageSurface'

interface Props {
  leftPage: PageData | null
  rightPage: PageData | null
  totalPages: number
  documentTitle: string
  spreadIndex: number
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
  onBodyHeightChange?: (pageNumber: number, height: number) => void
}

export function SpreadView({ leftPage, rightPage, totalPages, documentTitle, spreadIndex: _spreadIndex, showMarginGuide, sourceHighlight, sourceReduce, onBodyHeightChange }: Props) {
  return (
    <div className="flex gap-0" style={{ width: 'var(--spread-width)' }}>
      {rightPage
        ? <PageSurface page={{ ...rightPage, totalPages }} documentTitle={documentTitle} showMarginGuide={showMarginGuide} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} onBodyHeightChange={onBodyHeightChange} />
        : <div className="page-surface-empty" />
      }
      {leftPage
        ? <PageSurface page={{ ...leftPage, totalPages }} documentTitle={documentTitle} showMarginGuide={showMarginGuide} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} onBodyHeightChange={onBodyHeightChange} />
        : <div className="page-surface-empty" />
      }
    </div>
  )
}
