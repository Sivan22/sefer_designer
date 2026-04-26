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
    setStatusMsg('\u{05D8}\u{05D5}\u{05E2}\u{05DF} \u{05D0}\u{05EA} \u{05D4}\u{05DE}\u{05E1}\u{05DE}\u{05DA}...')
    try {
      const buffer = await file.arrayBuffer()
      setStatusMsg('\u{05DE}\u{05E2}\u{05D1}\u{05D3} \u{05D0}\u{05EA} \u{05D4}\u{05D3}\u{05E4}\u{05D9}\u{05DD}...')
      const parsed = await parseDocx(buffer)
      setStatusMsg('\u{05DE}\u{05E1}\u{05D3}\u{05E8} \u{05E2}\u{05DE}\u{05D5}\u{05D3}\u{05D9}\u{05DD}...')
      const layout = await layoutDocument(parsed)
      setDoc(layout)
      setState('done')
    } catch (e: unknown) {
      console.error(e)
      setError('\u{05E9}\u{05D2}\u{05D9}\u{05D0}\u{05D4} \u{05D1}\u{05D8}\u{05E2}\u{05D9}\u{05E0}\u{05EA} \u{05D4}\u{05DE}\u{05E1}\u{05DE}\u{05DA}. \u{05D0}\u{05E0}\u{05D0} \u{05E0}\u{05E1}\u{05D4} \u{05E9}\u{05D5}\u{05D1}.')
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
