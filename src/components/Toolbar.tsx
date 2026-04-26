import { FileText, BookOpen, Highlighter, Minimize2, AlignJustify, Download, FilePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ViewMode } from '@/types/document'
import { cn } from '@/lib/utils'

interface Props {
  viewMode: ViewMode
  onViewMode: (m: ViewMode) => void
  hasDoc: boolean
  hasSourceRefs: boolean
  sourceHighlight: boolean
  onSourceHighlight: () => void
  sourceReduce: boolean
  onSourceReduce: () => void
  showMarginGuide: boolean
  onToggleMargin: () => void
  isExporting: boolean
  exportProgress: number
  exportStatus: string
  onExport: () => void
  onNewDoc: () => void
}

export function Toolbar({
  viewMode, onViewMode, hasDoc, hasSourceRefs,
  sourceHighlight, onSourceHighlight,
  sourceReduce, onSourceReduce,
  showMarginGuide, onToggleMargin,
  isExporting, exportProgress, exportStatus,
  onExport, onNewDoc,
}: Props) {
  const activeCls = 'bg-background shadow-sm text-foreground'
  const inactiveCls = 'text-muted-foreground hover:text-foreground'

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* App title */}
        <span className="font-vilna font-bold text-[13pt] text-foreground mr-auto hidden sm:block">
          מציג מסמכים עבריים
        </span>

        {hasDoc && (
          <>
            {/* View mode */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => onViewMode('page')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', viewMode === 'page' ? activeCls : inactiveCls)}
                title="תצוגת עמוד בודד"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">עמוד</span>
              </button>
              <button
                onClick={() => onViewMode('spread')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', viewMode === 'spread' ? activeCls : inactiveCls)}
                title="תצוגת זוג עמודים"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">פריסה</span>
              </button>
            </div>

            {/* Source ref controls — only when source refs found */}
            {hasSourceRefs && (
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={onSourceHighlight}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', sourceHighlight ? activeCls : inactiveCls)}
                  title="Highlight source references"
                >
                  <Highlighter className="w-4 h-4" />
                  <span className="hidden sm:inline">Highlight</span>
                </button>
                <button
                  onClick={onSourceReduce}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', sourceReduce ? activeCls : inactiveCls)}
                  title="Reduce source reference font size"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Reduce</span>
                </button>
              </div>
            )}

            {/* Margin guide */}
            <button
              onClick={onToggleMargin}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', showMarginGuide ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="הצג/הסתר קווי שוליים"
            >
              <AlignJustify className="w-4 h-4" />
              <span className="hidden sm:inline">שוליים</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Export button */}
            <div className="relative">
              <Button
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="font-hebrew gap-2 px-6 py-2 text-base min-w-[120px]"
              >
                {isExporting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="tabular-nums">{Math.round(exportProgress)}%</span></>
                  : <><Download className="w-5 h-5" />PDF</>
                }
              </Button>
              {isExporting && (
                <div className="absolute -bottom-2 left-0 right-0">
                  <Progress value={exportProgress} className="h-1" />
                </div>
              )}
            </div>
          </>
        )}

        {/* New document */}
        {hasDoc && (
          <Button variant="ghost" size="sm" onClick={onNewDoc} className="font-hebrew gap-2">
            <FilePlus className="w-4 h-4" />
            מסמך חדש
          </Button>
        )}
      </div>

      {/* Status bar */}
      {isExporting && exportStatus && (
        <div className="bg-muted/50 border-t border-border px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="font-hebrew text-sm text-muted-foreground">{exportStatus}</span>
          </div>
        </div>
      )}
    </div>
  )
}
