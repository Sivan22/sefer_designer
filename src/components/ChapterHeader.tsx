interface Props {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
}

// Chapter block — matches example.pdf scale: large bold chapter number,
// then chapter title, then subtitle. All centred. Sits below the running
// header; only renders on a chapter's first page.
export function ChapterHeader({ chapterNumber, chapterTitle, subtitle }: Props) {
  if (!chapterNumber && !chapterTitle) return null
  return (
    <div className="text-center mb-6 flex-shrink-0">
      {chapterNumber && (
        <div className="font-vilna font-bold text-[33pt] leading-none text-black mb-3"
             style={{ WebkitTextStroke: '0.6px currentColor' }}>
          {chapterNumber}
        </div>
      )}
      {chapterTitle && (
        <div className="font-vilna font-bold text-[27pt] leading-tight text-black mb-2"
             style={{ WebkitTextStroke: '0.5px currentColor' }}>
          {chapterTitle}
        </div>
      )}
      {subtitle && (
        <div className="font-vilna font-bold text-[20pt] leading-tight text-black"
             style={{ WebkitTextStroke: '0.4px currentColor' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
