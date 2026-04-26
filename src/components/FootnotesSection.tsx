import { FootnoteItem, FootnotesLayout } from '@/types/document'

interface Props {
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
  layout: FootnotesLayout
  torahColumnName?: string
  storyColumnName?: string
  sourceHighlight?: boolean
  sourceReduce?: boolean
}

// Gradient decorative lines — matches original oJ component
const gradientRight: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, transparent, rgba(0,0,0,0.4) 80%)',
  height: '0.8rem',
  borderBottom: '1px solid rgba(0,0,0,0.25)',
}
const gradientLeft: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to left, transparent, rgba(0,0,0,0.4) 80%)',
  height: '0.8rem',
  borderBottom: '1px solid rgba(0,0,0,0.25)',
}

function ColumnDivider({ label }: { label: string }) {
  return (
    <div className="pb-3 flex-shrink-0">
      <div className="flex items-center">
        <div className="flex-1 h-[0.8rem]" style={gradientRight} />
        <span className="font-vilna font-bold text-base text-black whitespace-nowrap px-4">{label}</span>
        <div className="flex-1 h-[0.8rem]" style={gradientLeft} />
      </div>
    </div>
  )
}

function itemCls(f: FootnoteItem, font: string, size: string, hl?: boolean, rd?: boolean) {
  return [
    'footnote-item text-black', font, size,
    f.isSource && hl ? 'source-ref-highlight' : '',
    f.isSource && rd ? 'source-ref-reduce' : '',
  ].filter(Boolean).join(' ')
}

// Footnote item with marker prefix: (א) for Hebrew, [1] for numeric
function FN({ f, font, size, hl, rd }: {
  f: FootnoteItem; font: string; size: string; hl?: boolean; rd?: boolean
}) {
  const isHebrew = /^[א-ת]/.test(f.marker)
  const prefix = isHebrew
    ? `<span class="footnote-marker">(${f.marker})</span>`
    : `<span class="footnote-marker">[${f.marker}]</span>`
  return (
    <div
      className={itemCls(f, font, size, hl, rd)}
      dangerouslySetInnerHTML={{ __html: prefix + ' ' + f.formattedContent }}
    />
  )
}

export function FootnotesSection({
  torahFootnotes,
  storyFootnotes,
  layout,
  torahColumnName = 'מקור השפע',
  storyColumnName = 'צינור השפע',
  sourceHighlight,
  sourceReduce,
}: Props) {
  if (layout === 'none' || (!torahFootnotes.length && !storyFootnotes.length)) return null

  // ── Single-source: newspaper 2-column ──────────────────────────────────────
  if (layout === 'single-torah' || layout === 'single-story') {
    const isTorah = layout === 'single-torah'
    const items = isTorah ? torahFootnotes : storyFootnotes
    const label = isTorah ? torahColumnName : storyColumnName
    const font = isTorah ? 'font-frank' : 'font-shefa'
    const size = isTorah ? 'text-[10pt] leading-relaxed' : 'text-[11pt] leading-snug'
    return (
      <div className="border-t border-black/15 pt-3">
        <ColumnDivider label={label} />
        <div className="single-source-flow" style={{ columnCount: 2, columnGap: '1.5rem' }}>
          <div className="space-y-2">
            {items.map(f => <FN key={f.id} f={f} font={font} size={size} hl={sourceHighlight} rd={sourceReduce} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Dual-source: determine which column is taller ──────────────────────────
  const torahChars = torahFootnotes.reduce((s, f) => s + f.formattedContent.replace(/<[^>]+>/g, '').length, 0)
  const storyChars = storyFootnotes.reduce((s, f) => s + f.formattedContent.replace(/<[^>]+>/g, '').length, 0)
  const torahTaller = torahChars >= storyChars

  // ── Grid (even columns) ────────────────────────────────────────────────────
  if (layout === 'grid') {
    return (
      <div className="border-t border-black/15 pt-3">
        <div className="grid grid-cols-2 gap-6">
          {/* Story on right (RTL first col), Torah on left (RTL second col) */}
          <div>
            <ColumnDivider label={storyColumnName} />
            <div className="space-y-2">
              {storyFootnotes.map(f => <FN key={f.id} f={f} font="font-shefa" size="text-[11pt] leading-snug" hl={sourceHighlight} rd={sourceReduce} />)}
            </div>
          </div>
          <div>
            <ColumnDivider label={torahColumnName} />
            <div className="space-y-2">
              {torahFootnotes.map(f => <FN key={f.id} f={f} font="font-frank" size="text-[10pt] leading-relaxed" hl={sourceHighlight} rd={sourceReduce} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── L-shape float ──────────────────────────────────────────────────────────
  const floatSide  = torahTaller ? 'right' : 'left'
  const floatItems = torahTaller ? torahFootnotes : storyFootnotes
  const floatLabel = torahTaller ? torahColumnName : storyColumnName
  const floatFont  = torahTaller ? 'font-frank' : 'font-shefa'
  const floatSize  = torahTaller ? 'text-[10pt] leading-relaxed' : 'text-[11pt] leading-snug'
  const wrapItems  = torahTaller ? storyFootnotes : torahFootnotes
  const wrapLabel  = torahTaller ? storyColumnName : torahColumnName
  const wrapFont   = torahTaller ? 'font-shefa' : 'font-frank'
  const wrapSize   = torahTaller ? 'text-[11pt] leading-snug' : 'text-[10pt] leading-relaxed'

  const floatStyle: React.CSSProperties = {
    float: floatSide,
    width: 'calc(50% - 0.75rem)',
    ...(floatSide === 'right' ? { marginLeft: '1.5rem' } : { marginRight: '1.5rem' }),
  }

  return (
    <div className="border-t border-black/15 pt-3 flow-root">
      <div style={floatStyle}>
        <ColumnDivider label={floatLabel} />
        <div className="space-y-2">
          {floatItems.map(f => <FN key={f.id} f={f} font={floatFont} size={floatSize} hl={sourceHighlight} rd={sourceReduce} />)}
        </div>
      </div>
      <div>
        <ColumnDivider label={wrapLabel} />
        <div className="space-y-2">
          {wrapItems.map(f => <FN key={f.id} f={f} font={wrapFont} size={wrapSize} hl={sourceHighlight} rd={sourceReduce} />)}
        </div>
      </div>
      <div className="clear-both" />
    </div>
  )
}
