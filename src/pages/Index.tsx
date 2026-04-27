import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { UploadZone } from '@/components/UploadZone'
import { Toolbar } from '@/components/Toolbar'
import { PageSurface } from '@/components/PageSurface'
import { SpreadView } from '@/components/SpreadView'
import { useDocumentLoader } from '@/hooks/useDocumentLoader'
import { useExport } from '@/hooks/useExport'
import { ViewMode } from '@/types/document'
import { toast } from 'sonner'

export default function Index() {
  const { doc, state, statusMsg, error, loadFile, reset, setBodyHeight, reflowing } = useDocumentLoader()
  const { progress, status, isExporting, doExport } = useExport()
  const [viewMode, setViewMode] = useState<ViewMode>('spread')
  const [sourceHighlight, setSourceHighlight] = useState(false)
  const [sourceReduce, setSourceReduce] = useState(false)
  const [showMarginGuide, setShowMarginGuide] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleExport = () => {
    if (!doc) return
    doExport(containerRef, viewMode, doc.title).then(() => {
      toast.success('ייצוא הושלם', { description: 'הקובץ הורד בהצלחה' })
    }).catch((e) => {
      toast.error('שגיאה בייצוא הקובץ', { description: e.message })
    })
  }

  const hasSourceRefs = (doc?.pages ?? []).some(
    (p) => p.torahFootnotes.some((f) => f.isSource) || p.storyFootnotes.some((f) => f.isSource)
  )

  // Upload / initial state
  if (state === 'idle' || state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
        <Upload className="w-16 h-16 text-ornament" strokeWidth={1.5} />
        <h1 className="font-hebrew font-bold text-3xl mb-2 text-foreground">מציג מסמכים עבריים</h1>
        <p className="font-hebrew text-sm text-muted-foreground mb-4">
          העלה מסמך Word או בחר מסמך לדוגמה
        </p>
        {error && <p className="font-hebrew text-destructive text-center">{error}</p>}
        <UploadZone onFileLoad={loadFile} isLoading={false} />
      </div>
    )
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Upload className="w-10 h-10 text-ornament animate-pulse" strokeWidth={1.5} />
          <p className="font-hebrew text-lg font-semibold text-foreground">{statusMsg || 'טוען מסמך...'}</p>
        </div>
      </div>
    )
  }

  // Document viewer state
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Toolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        hasDoc={!!doc}
        hasSourceRefs={hasSourceRefs}
        sourceHighlight={sourceHighlight}
        onSourceHighlight={() => setSourceHighlight((v) => !v)}
        sourceReduce={sourceReduce}
        onSourceReduce={() => setSourceReduce((v) => !v)}
        showMarginGuide={showMarginGuide}
        onToggleMargin={() => setShowMarginGuide((v) => !v)}
        isExporting={isExporting}
        exportProgress={progress}
        exportStatus={status?.status ?? ''}
        onExport={handleExport}
        onNewDoc={reset}
      />

      <main className="py-8 px-4 overflow-x-auto">
        {doc && viewMode === 'page' && (
          <div ref={containerRef} className="spreads-container">
            {doc.pages.map((page) => (
              <PageSurface
                key={page.pageNumber}
                page={page}
                documentTitle={doc.title}
                showMarginGuide={showMarginGuide}
                sourceHighlight={sourceHighlight}
                sourceReduce={sourceReduce}
                onBodyHeightChange={setBodyHeight}
              />
            ))}
          </div>
        )}

        {doc && viewMode === 'spread' && (
          <div ref={containerRef} className="spreads-container">
            {doc.spreads.map((spread) => (
              <SpreadView
                key={spread.spreadIndex}
                spreadIndex={spread.spreadIndex}
                leftPage={spread.left}
                rightPage={spread.right}
                totalPages={doc.pages.length}
                documentTitle={doc.title}
                showMarginGuide={showMarginGuide}
                sourceHighlight={sourceHighlight}
                sourceReduce={sourceReduce}
                onBodyHeightChange={setBodyHeight}
              />
            ))}
          </div>
        )}
      </main>

      {reflowing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md bg-foreground/80 text-background text-sm pointer-events-none z-50">
          מסדר עמודים...
        </div>
      )}
    </div>
  )
}
