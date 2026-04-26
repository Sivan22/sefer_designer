import { FootnoteItem } from '@/types/document'

interface Props {
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
  torahColumnName?: string
  storyColumnName?: string
  sourceHighlight?: boolean
  sourceReduce?: boolean
}

function FootnoteColumn({ items, sourceHighlight, sourceReduce }: {
  items: FootnoteItem[]
  sourceHighlight?: boolean
  sourceReduce?: boolean
}) {
  return (
    <div className="font-shefa leading-snug text-[11pt] space-y-2">
      {items.map((f) => (
        <div
          key={f.id}
          className={`footnote-item text-black${f.isSource && sourceHighlight ? ' source-ref-highlight' : ''}${f.isSource && sourceReduce ? ' source-ref-reduce' : ''}`}
          dangerouslySetInnerHTML={{ __html: f.formattedContent }}
        />
      ))}
    </div>
  )
}

function ColumnDivider({ label }: { label: string }) {
  return (
    <div className="pb-3">
      <div className="flex items-center">
        <div className="h-[0.8rem] flex-1 border-b border-foreground/20" />
        <span className="font-vilna font-bold text-base text-black whitespace-nowrap px-4">{label}</span>
        <div className="h-[0.8rem] flex-1 border-b border-foreground/20" />
      </div>
    </div>
  )
}

export function FootnotesSection({ torahFootnotes, storyFootnotes, torahColumnName = 'מקור השפע', storyColumnName = 'צינור השפע', sourceHighlight, sourceReduce }: Props) {
  const hasTwo = torahFootnotes.length > 0 && storyFootnotes.length > 0
  const hasTorah = torahFootnotes.length > 0
  const hasStory = storyFootnotes.length > 0

  if (!hasTorah && !hasStory) return null

  if (hasTwo) {
    return (
      <div className="border-t border-foreground/20 pt-3 mt-2">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <ColumnDivider label={torahColumnName} />
            <FootnoteColumn items={torahFootnotes} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} />
          </div>
          <div>
            <ColumnDivider label={storyColumnName} />
            <FootnoteColumn items={storyFootnotes} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} />
          </div>
        </div>
      </div>
    )
  }

  const items = hasTorah ? torahFootnotes : storyFootnotes
  const label = hasTorah ? torahColumnName : storyColumnName
  return (
    <div className="border-t border-foreground/20 pt-3 mt-2">
      <ColumnDivider label={label} />
      <div className="single-source-flow" style={{ columnCount: 2, columnGap: '1.5rem' }}>
        <div className="space-y-2">
          {items.map((f) => (
            <div
              key={f.id}
              className={`font-shefa leading-snug text-[11pt] text-black footnote-item${f.isSource && sourceHighlight ? ' source-ref-highlight' : ''}${f.isSource && sourceReduce ? ' source-ref-reduce' : ''}`}
              dangerouslySetInnerHTML={{ __html: f.formattedContent }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
