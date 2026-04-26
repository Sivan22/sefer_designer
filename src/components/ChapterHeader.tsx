// Gradient line styles matching the original oJ column-divider component
const gradR: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, transparent, rgba(0,0,0,0.4) 80%)',
  height: '0.8rem',
  borderBottom: '1px solid rgba(0,0,0,0.25)',
  flex: 1,
}
const gradL: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to left, transparent, rgba(0,0,0,0.4) 80%)',
  height: '0.8rem',
  borderBottom: '1px solid rgba(0,0,0,0.25)',
  flex: 1,
}

interface Props {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
}

export function ChapterHeader({ chapterNumber, chapterTitle, subtitle }: Props) {
  if (!chapterNumber && !chapterTitle) return null
  return (
    <div className="text-center mb-3 flex-shrink-0">
      {chapterNumber && (
        <div className="flex items-center mb-1">
          <div style={gradR} />
          <span className="font-vilna font-bold text-base text-black whitespace-nowrap px-4">
            {chapterNumber}
          </span>
          <div style={gradL} />
        </div>
      )}
      {chapterTitle && (
        <p className="font-vilna font-bold text-[16pt] leading-tight text-black mt-2 text-center"
           style={{ WebkitTextStroke: '0.4px currentColor' }}>
          {chapterTitle}
        </p>
      )}
      {subtitle && (
        <p className="font-tehila text-[10pt] font-normal mt-1 text-foreground text-right"
           style={{ WebkitTextStroke: '0.2px currentColor' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
