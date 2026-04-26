import { useState, useCallback } from 'react'
import { exportToPdf } from '@/lib/pdf-export'
import { ViewMode, ExportStatus } from '@/types/document'

export function useExport() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<ExportStatus | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stageProgress: Record<string, number> = {
    preparing: 10,
    uploading: 30,
    processing: 60,
    downloading: 85,
    saving: 95,
    done: 100,
  }

  const doExport = useCallback(async (
    containerRef: React.RefObject<HTMLElement>,
    viewMode: ViewMode,
    title: string
  ) => {
    if (!containerRef.current) return
    setIsExporting(true)
    setError(null)
    setProgress(0)

    const html = containerRef.current.innerHTML

    try {
      await exportToPdf(html, viewMode, title, (s) => {
        setStatus(s)
        setProgress(stageProgress[s.stage] ?? 0)
      })
    } catch (e: any) {
      setError(e.message || 'שגיאה בייצוא')
    } finally {
      setIsExporting(false)
      setTimeout(() => { setStatus(null); setProgress(0) }, 3000)
    }
  }, [])

  return { progress, status, isExporting, error, doExport }
}
