import { supabase } from './supabase'
import { FootnoteItem } from '@/types/document'

interface ClassifyItem {
  footnoteId: string
  groups: string[]
}

interface ClassifyResult {
  footnoteId: string
  isSource: boolean
}

const cache = new Map<string, boolean>()

function cacheKey(item: ClassifyItem) {
  return item.footnoteId + '::' + item.groups.join('|')
}

export async function classifyRefs(
  footnotes: FootnoteItem[]
): Promise<FootnoteItem[]> {
  if (!footnotes.length) return footnotes

  const items: ClassifyItem[] = footnotes.map((f) => ({
    footnoteId: f.id,
    groups: [f.formattedContent.replace(/<[^>]+>/g, '').trim()],
  }))

  const cached = items.filter((i) => cache.has(cacheKey(i)))
  const uncached = items.filter((i) => !cache.has(cacheKey(i)))

  let results: ClassifyResult[] = cached.map((i) => ({
    footnoteId: i.footnoteId,
    isSource: cache.get(cacheKey(i))!,
  }))

  if (uncached.length > 0) {
    const { data, error } = await supabase.functions.invoke('classify-refs', {
      body: { items: uncached },
    })
    if (!error && data?.results) {
      for (const r of data.results as ClassifyResult[]) {
        const item = uncached.find((i) => i.footnoteId === r.footnoteId)
        if (item) cache.set(cacheKey(item), r.isSource)
      }
      results = [...results, ...data.results]
    }
  }

  return footnotes.map((f) => {
    const r = results.find((x) => x.footnoteId === f.id)
    return r ? { ...f, isSource: r.isSource } : f
  })
}
