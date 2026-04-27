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
    <div className="pb-2 flex-shrink-0">
      <div className="flex items-center">
        <div className="flex-1 h-[0.8rem]" style={gradientRight} />
        <span
          className="font-vilna font-bold text-black whitespace-nowrap px-3"
          style={{ fontSize: '11pt', letterSpacing: '0.02em' }}
        >
          {label}
        </span>
        <div className="flex-1 h-[0.8rem]" style={gradientLeft} />
      </div>
    </div>
  )
}

function itemCls(f: FootnoteItem, font: string, size: string, hl?: boolean, rd?: boolean) {
  return [
    'footnote-item text-black', font, size,
    f.isSplitHead ? 'split-head' : '',
    f.isSource && hl ? 'source-ref-highlight' : '',
    f.isSource && rd ? 'source-ref-reduce' : '',
  ].filter(Boolean).join(' ')
}

// Footnote item renderer. Continuation notes (split tails) show no marker.
function FN({ f, font, size, hl, rd }: {
  f: FootnoteItem; font: string; size: string; hl?: boolean; rd?: boolean
}) {
  const content = f.formattedContent.trim().replace(/^<p[^>]*>([\s\S]*?)<\/p>$/, '$1')
  if (f.isContinuation) {
    return (
      <div
        className={itemCls(f, font, size, hl, rd)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }
  const isHebrew = /^[א-ת]/.test(f.marker)
  const marker = isHebrew ? `(${f.marker})` : `[${f.marker}]`
  return (
    <div
      className={itemCls(f, font, size, hl, rd)}
      dangerouslySetInnerHTML={{ __html: `<span class="footnote-marker">${marker}</span> ${content}` }}
    />
  )
}

export function FootnotesSection({
  torahFootnotes,
  storyFootnotes,
  layout,
  // צינור השפע = endnotes (torahFootnotes, Hebrew-letter markers)
  // מקור השפע  = footnotes (storyFootnotes, numeric markers)
  torahColumnName = 'צינור השפע',
  storyColumnName = 'מקור השפע',
  sourceHighlight,
  sourceReduce,
}: Props) {
  if (layout === 'none' || (!torahFootnotes.length && !storyFootnotes.length)) return null
  const isFloat = layout === 'float-torah' || layout === 'float-story'

  // ── Single-source: newspaper 2-column ──────────────────────────────────────
  if (layout === 'single-torah' || layout === 'single-story') {
    const isTorah = layout === 'single-torah'
    const items = isTorah ? torahFootnotes : storyFootnotes
    const label = isTorah ? torahColumnName : storyColumnName
    // Fonts swapped to match example.pdf:
    //   צינור השפע (torah) → Shefa
    //   מקור השפע  (story) → Frank
    const font = isTorah ? 'font-shefa' : 'font-frank'
    const size = isTorah ? 'text-[11.5pt] leading-snug' : 'text-[8pt] leading-relaxed'
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

  // ── Grid (even columns) ────────────────────────────────────────────────────
  if (layout === 'grid') {
    return (
      <div className="border-t border-black/15 pt-3">
        <div className="grid grid-cols-2 gap-6">
          {/* צינור השפע (endnotes) on right/RTL-first, מקור השפע (footnotes) on left/RTL-second */}
          <div>
            <ColumnDivider label={torahColumnName} />
            <div className="space-y-2">
              {torahFootnotes.map(f => <FN key={f.id} f={f} font="font-shefa" size="text-[11.5pt] leading-snug" hl={sourceHighlight} rd={sourceReduce} />)}
            </div>
          </div>
          <div>
            <ColumnDivider label={storyColumnName} />
            <div className="space-y-2">
              {storyFootnotes.map(f => <FN key={f.id} f={f} font="font-frank" size="text-[8pt] leading-relaxed" hl={sourceHighlight} rd={sourceReduce} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── L-shape float ──────────────────────────────────────────────────────────
  // Dividers go in a flex row at the top. The SHORTER column floats; the LONGER
  // column is a normal block, whose inline content wraps in shortened line boxes
  // alongside the float, then resumes full width once the float ends — creating
  // the L-shape. The longer column MUST NOT be a BFC (no overflow:hidden), or
  // it would sit beside the float instead of wrapping it.
  if (!isFloat) return null
  const torahIsTaller = layout === 'float-torah'
  // Font assignments after swap:
  //   torah column → font-shefa @ 10.5pt
  //   story column → font-frank @ 9pt
  const floatItems = torahIsTaller ? storyFootnotes : torahFootnotes  // shorter
  const floatFont  = torahIsTaller ? 'font-frank' : 'font-shefa'
  const floatSize  = torahIsTaller ? 'text-[8pt] leading-relaxed' : 'text-[11.5pt] leading-snug'
  // RTL: torah always physical-right.
  // torahIsTaller → story (shorter) on left → floats LEFT
  // !torahIsTaller → torah (shorter) on right → floats RIGHT
  const floatSide  = torahIsTaller ? 'left' : 'right'
  const wrapItems  = torahIsTaller ? torahFootnotes : storyFootnotes   // longer
  const wrapFont   = torahIsTaller ? 'font-shefa' : 'font-frank'
  const wrapSize   = torahIsTaller ? 'text-[11.5pt] leading-snug' : 'text-[8pt] leading-relaxed'

  const floatStyle: React.CSSProperties = {
    float: floatSide,
    width: 'calc(50% - 0.75rem)',
    ...(floatSide === 'right' ? { marginLeft: '1.5rem' } : { marginRight: '1.5rem' }),
  }

  return (
    <div className="border-t border-black/15 pt-3 flow-root">
      {/* Dividers row — RTL parent puts torah on right, story on left */}
      <div className="flex gap-6 mb-2">
        <div className="flex-1">
          <ColumnDivider label={torahColumnName} />
        </div>
        <div className="flex-1">
          <ColumnDivider label={storyColumnName} />
        </div>
      </div>
      {/* Float: shorter column items only */}
      <div style={floatStyle} className="space-y-2">
        {floatItems.map(f => <FN key={f.id} f={f} font={floatFont} size={floatSize} hl={sourceHighlight} rd={sourceReduce} />)}
      </div>
      {/* Longer column items: normal block, NO BFC. Line boxes wrap around float
          while it persists; expand to full width below it → L-shape. */}
      <div className="space-y-2">
        {wrapItems.map(f => <FN key={f.id} f={f} font={wrapFont} size={wrapSize} hl={sourceHighlight} rd={sourceReduce} />)}
      </div>
    </div>
  )
}
