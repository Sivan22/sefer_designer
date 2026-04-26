interface Props {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
}

export function ChapterHeader({ chapterNumber, chapterTitle, subtitle }: Props) {
  if (!chapterNumber && !chapterTitle) return null
  return (
    <div className="py-1 flex items-center justify-center gap-4 text-center mb-3">
      {chapterNumber && (
        <div className="flex items-center">
          <div className="h-[0.8rem] flex-1 border-b border-foreground/20" />
          <span className="font-vilna font-bold text-base text-black whitespace-nowrap px-4">
            {chapterNumber}
          </span>
          <div className="h-[0.8rem] flex-1 border-b border-foreground/20" />
        </div>
      )}
      {chapterTitle && (
        <p className="font-vilna font-bold text-[16pt] leading-tight text-black mt-3 text-center w-full">
          {chapterTitle}
        </p>
      )}
      {subtitle && (
        <p className="font-tehila text-[10pt] font-normal mb-0 text-foreground text-right w-full"
           style={{ WebkitTextStroke: '0.2px currentColor' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
