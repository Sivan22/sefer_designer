import { supabase } from './supabase'
import { ViewMode, ExportStatus } from '@/types/document'

export async function exportToPdf(
  html: string,
  viewMode: ViewMode,
  title: string,
  onStatus?: (s: ExportStatus) => void
): Promise<void> {
  onStatus?.({ status: 'מכין מסמך...', stage: 'preparing' })

  onStatus?.({ status: 'שולח לשרת...', stage: 'uploading' })
  const { data, error } = await supabase.functions.invoke('pdf-export', {
    body: { html, viewMode, title },
  })

  if (error) throw new Error(error.message || 'Failed to call PDF export service')
  if (data?.error) throw new Error(data.error)

  onStatus?.({ status: 'מוריד PDF...', stage: 'downloading' })

  // data is expected to be a base64 string or blob URL
  const blob = data instanceof Blob
    ? data
    : new Blob([Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))], { type: 'application/pdf' })

  onStatus?.({ status: 'שומר קובץ...', stage: 'saving' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.pdf`
  a.click()
  URL.revokeObjectURL(url)

  onStatus?.({ status: 'הושלם!', stage: 'done' })
}
