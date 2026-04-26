import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Upload, CheckCircle, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PdfFile { name: string; url: string }

function FileDropZone({ label, subtitle, file, onFile, accentColor = 'amber', bgClass = 'bg-white' }: {
  label: string
  subtitle: string
  file: PdfFile | null
  onFile: (f: PdfFile) => void
  accentColor?: string
  bgClass?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (f: File) => {
    if (!f || !/\.pdf$/i.test(f.name)) return
    const url = URL.createObjectURL(f)
    onFile({ name: f.name, url })
  }

  const colorMap: Record<string, { icon: string; drag: string; fileName: string }> = {
    amber: { icon: 'text-amber-500', drag: 'border-amber-400 bg-amber-50/50', fileName: 'text-gray-700' },
    emerald: { icon: 'text-emerald-500', drag: 'border-emerald-400 bg-emerald-50/50', fileName: 'text-gray-700' },
  }
  const c = colorMap[accentColor] ?? colorMap.amber

  return (
    <div
      className={cn('flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all group', isDragging ? c.drag : 'border-gray-200 hover:border-gray-300', bgClass)}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {file ? (
        <div className="text-center">
          <CheckCircle className={cn('w-10 h-10 mx-auto mb-3', c.icon)} />
          <p className={cn('text-sm font-semibold', c.fileName)}>{file.name}</p>
          <p className="text-xs text-gray-400 mt-1">Click to change</p>
        </div>
      ) : (
        <div className="text-center">
          <Upload className={cn('w-12 h-12 transition-colors duration-200', isDragging ? c.icon : `text-gray-300 group-hover:${c.icon}`)} strokeWidth={1.5} />
          <p className="text-sm font-semibold text-gray-600 mt-3">{label}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 justify-center">
            <Upload className="w-4 h-4" />
            Click to browse or drag &amp; drop
          </p>
        </div>
      )}
    </div>
  )
}

function PdfPageView({ fileUrl, pageNumber }: { fileUrl: string; pageNumber: number }) {
  return (
    <div style={{ width: 550, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4 }}>
      <iframe src={`${fileUrl}#page=${pageNumber}`} width={550} height={750} style={{ border: 'none', display: 'block' }} title="PDF view" />
    </div>
  )
}

export default function Compare() {
  const navigate = useNavigate()
  const [refFile, setRefFile] = useState<PdfFile | null>(null)
  const [yourFile, setYourFile] = useState<PdfFile | null>(null)
  const [pages, setPages] = useState<number[]>([1])

  const bothLoaded = refFile && yourFile

  if (!bothLoaded) {
    return (
      <div className="h-screen flex">
        <FileDropZone label="Reference PDF" subtitle="The original document" file={refFile} onFile={setRefFile} accentColor="amber" bgClass="bg-amber-50/30" />
        <FileDropZone label="Your PDF" subtitle="The document to compare" file={yourFile} onFile={setYourFile} accentColor="emerald" bgClass="bg-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="flex items-center gap-1.5">
          <ArrowRight className="w-4 h-4" />Back
        </Button>
        <div className="h-5 w-px bg-gray-200" />
        <h1 className="text-lg font-semibold text-gray-900">PDF Comparison</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="flex items-center gap-1.5">
            <Download className="w-4 h-4" />Export PDF
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full">
        {/* Column headers */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Reference PDF</span>
            <span className="text-xs text-gray-400">— The original document</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Your PDF</span>
            <span className="text-xs text-gray-400">— The document to compare</span>
          </div>
        </div>

        {pages.map((pageNum, idx) => (
          <div key={idx} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-500">Pages:</span>
              <span className="text-sm text-gray-700">{pageNum}</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <div className="w-full px-4 py-2 bg-amber-50/50 border-b border-gray-100 flex justify-center">
                  <span className="text-xs text-gray-400">Yours</span>
                </div>
                <PdfPageView fileUrl={refFile.url} pageNumber={pageNum} />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full px-4 py-2 bg-emerald-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600">VS</span>
                </div>
                <PdfPageView fileUrl={yourFile.url} pageNumber={pageNum} />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setPages((p) => [...p, p[p.length - 1] + 1])}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <Plus className="w-4 h-4" />Add page
        </button>
      </div>
    </div>
  )
}
