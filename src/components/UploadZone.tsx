import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onFileLoad: (file: File) => void
  isLoading: boolean
}

export function UploadZone({ onFileLoad, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (file && /\.docx?$/i.test(file.name)) onFileLoad(file)
  }, [onFileLoad])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors',
        isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <Upload className="w-10 h-10 mx-auto mb-4 text-ornament" strokeWidth={1.5} />
      <p className="font-hebrew text-lg mb-2 text-foreground">גרור לכאן קובץ Word</p>
      <p className="font-hebrew text-sm text-muted-foreground mb-4">או לחץ לבחירת קובץ</p>
      <Button
        variant="secondary"
        disabled={isLoading}
        className="font-hebrew"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
      >
        {isLoading ? 'טוען...' : 'בחר קובץ'}
      </Button>
    </div>
  )
}
