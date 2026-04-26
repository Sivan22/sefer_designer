import { useState, useCallback } from 'react'
import { parseDocx } from '@/lib/mammoth-parser'
import { layoutDocument } from '@/lib/document-layout'
import { ParsedDocument } from '@/types/document'

export type LoadingState = 'idle' | 'loading' | 'done' | 'error'

export function useDocumentLoader() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null)
  const [state, setState] = useState<LoadingState>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async (file: File) => {
    setState('loading')
    setError(null)
    setStatusMsg('טוען את המסמך...')
    try {
      const buffer = await file.arrayBuffer()
      setStatusMsg('מעבד את הדפים...')
      const { title, chapters } = await parseDocx(buffer)
      setStatusMsg('מסדר עמודים...')
      const parsed = layoutDocument(chapters, title || file.name.replace('.docx', ''))
      setDoc(parsed)
      setState('done')
    } catch (e) {
      setError('שגיאה בטעינת המסמך. אנא נסה שוב.')
      setState('error')
    }
  }, [])

  const reset = useCallback(() => {
    setDoc(null)
    setState('idle')
    setError(null)
    setStatusMsg('')
  }, [])

  return { doc, state, statusMsg, error, loadFile, reset }
}
