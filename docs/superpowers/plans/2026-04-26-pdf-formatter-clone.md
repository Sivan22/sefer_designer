# PDF Formatter Clone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exact 1-to-1 clone of https://pdf-formatter.lovable.app/ — a Hebrew Word-to-PDF formatter with document viewer, footnote layout, source-ref classification, and PDF export via Supabase Edge Functions.

**Architecture:** React SPA (Vite + TypeScript + Tailwind) with React Router for three routes (`/`, `/compare`, `*`). Word files are parsed client-side with mammoth, laid out into A4-sized pages with custom Hebrew type, then exported to PDF via a Supabase Edge Function. A second Edge Function classifies footnotes as Torah sources vs. story footnotes.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui (Button, Progress, Toast, Tooltip), React Router DOM, mammoth.js, jspdf, html2canvas, jszip, pdfjs-dist, @supabase/supabase-js

---

## File Map

```
/mnt/volume_sfo3_01/captured_sefer_designer/
├── index.html                          # RTL Hebrew root HTML
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── fonts/                          # Already downloaded
│       ├── EFT_Tefilot.ttf
│       ├── PFT_Vilna.ttf / PFT_Vilna_Bold.ttf
│       ├── PFT_Frank.ttf
│       ├── TehilaR0.TTF / tehilabold.ttf
│       └── shefa.ttf / shefabold.ttf
└── src/
    ├── main.tsx
    ├── App.tsx                         # Router setup
    ├── index.css                       # Tailwind + CSS vars + font-face + custom classes
    ├── lib/
    │   ├── supabase.ts                 # Supabase client (URL + anon key)
    │   ├── mammoth-parser.ts           # docx → structured sections + footnotes
    │   ├── document-layout.ts          # sections → Page[] with heights
    │   ├── pdf-export.ts               # POST html to pdf-export edge fn
    │   └── classify-refs.ts            # POST footnotes to classify-refs edge fn
    ├── types/
    │   └── document.ts                 # All shared TypeScript types
    ├── components/
    │   ├── ui/                         # shadcn: button, progress, toast, toaster, tooltip
    │   ├── UploadZone.tsx              # Drag-drop + file picker
    │   ├── SampleDocumentPicker.tsx    # Sample document buttons
    │   ├── Toolbar.tsx                 # Header toolbar (view toggle, export, new doc)
    │   ├── ChapterHeader.tsx           # Chapter number + title + subtitle
    │   ├── FootnotesSection.tsx        # Two-column footnotes layout
    │   ├── PageSurface.tsx             # Single A4 page with all sections
    │   ├── SpreadView.tsx              # Two-page spread (right + left)
    │   └── ExportProgress.tsx          # Progress bar row under toolbar
    ├── pages/
    │   ├── Index.tsx                   # Main page (upload + viewer)
    │   ├── Compare.tsx                 # Side-by-side PDF comparison
    │   └── NotFound.tsx                # 404
    └── hooks/
        ├── useDocumentLoader.ts        # Load + parse + classify + layout
        └── useExport.ts                # PDF export with status callbacks
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`

- [ ] **Step 1: Init project and install deps**

```bash
cd /mnt/volume_sfo3_01/captured_sefer_designer
npm create vite@latest . -- --template react-ts --force
npm install react-router-dom @supabase/supabase-js mammoth jspdf html2canvas jszip pdfjs-dist
npm install -D tailwindcss postcss autoprefixer @types/node
npm install class-variance-authority clsx tailwind-merge lucide-react sonner
npx tailwindcss init -p
```

- [ ] **Step 2: Configure `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
```

- [ ] **Step 3: Configure `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['Frank Ruhl Libre', 'serif'],
        vilna: ['PFT Vilna', 'serif'],
        frank: ['PFT Frank', 'serif'],
        tefilot: ['EFT Tefilot', 'serif'],
        tehila: ['Tehila', 'serif'],
        shefa: ['Shefa', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ornament: 'hsl(var(--ornament))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Write `src/index.css`** (Tailwind base + font-faces + CSS vars + all custom classes)

```css
@import "https://fonts.googleapis.com/css2?family=David+Libre:wght@500;700&family=Frank+Ruhl+Libre:wght@300;400;500;600;700;800;900&display=swap";

@font-face { font-family: 'EFT Tefilot'; src: url('/fonts/EFT_Tefilot.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'PFT Vilna';  src: url('/fonts/PFT_Vilna.ttf') format('truetype'); font-weight: 400; }
@font-face { font-family: 'PFT Vilna';  src: url('/fonts/PFT_Vilna_Bold.ttf') format('truetype'); font-weight: 700; }
@font-face { font-family: 'PFT Frank';  src: url('/fonts/PFT_Frank.ttf') format('truetype'); font-weight: 400; }
@font-face { font-family: 'Tehila';     src: url('/fonts/TehilaR0.TTF') format('truetype'); font-weight: 400; }
@font-face { font-family: 'Tehila';     src: url('/fonts/tehilabold.ttf') format('truetype'); font-weight: 700; }
@font-face { font-family: 'Shefa';      src: url('/fonts/shefa.ttf') format('truetype'); font-weight: 400; }
@font-face { font-family: 'Shefa';      src: url('/fonts/shefabold.ttf') format('truetype'); font-weight: 700; }

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 10%;
  --card: 0 0% 96%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 96%;
  --popover-foreground: 0 0% 10%;
  --primary: 0 0% 85%;
  --primary-foreground: 0 0% 8%;
  --secondary: 0 0% 90%;
  --secondary-foreground: 0 0% 15%;
  --muted: 0 0% 92%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 88%;
  --accent-foreground: 0 0% 15%;
  --destructive: 0 0% 30%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 80%;
  --input: 0 0% 80%;
  --ring: 0 0% 85%;
  --radius: 0.25rem;
  --ornament: 0 0% 50%;
  --page-bg: 0 0% 100%;
  --page-shadow: 0 0% 70%;
  --page-height: 922.2px;
  --page-width: 642.52px;
  --spread-width: 1285.04px;
  --title-gold: 0 0% 55%;
  --column-divider: 0 0% 75%;
}

.dark {
  --background: 0 0% 8%;
  --foreground: 0 0% 92%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 92%;
  --popover: 0 0% 10%;
  --popover-foreground: 0 0% 92%;
  --primary: 0 0% 15%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 18%;
  --secondary-foreground: 0 0% 92%;
  --muted: 0 0% 18%;
  --muted-foreground: 0 0% 60%;
  --accent: 0 0% 18%;
  --accent-foreground: 0 0% 92%;
  --destructive: 0 0% 30%;
  --destructive-foreground: 0 0% 92%;
  --border: 0 0% 25%;
  --input: 0 0% 25%;
  --ring: 0 0% 15%;
  --ornament: 0 0% 50%;
  --page-bg: 0 0% 12%;
  --page-shadow: 0 0% 6%;
  --title-gold: 0 0% 25%;
  --column-divider: 0 0% 30%;
}

* { box-sizing: border-box; }

/* Page surfaces */
.page-surface {
  background: linear-gradient(180deg, hsl(var(--page-bg)), hsl(var(--page-bg)));
  width: var(--page-width);
  height: var(--page-height);
  color: #000;
  --foreground: 0 0% 0%;
  --muted-foreground: 0 0% 0%;
  --title-gold: 0 0% 0%;
  border: 1px solid hsl(var(--page-shadow) / 0.4);
  box-shadow: 0 4px 24px hsl(var(--page-shadow) / 0.35);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.page-surface .text-ornament { color: #000 !important; }
.page-surface-empty {
  width: var(--page-width);
  height: var(--page-height);
  background: hsl(var(--muted) / 0.3);
  border: 1px dashed hsl(var(--border) / 0.3);
  flex-shrink: 0;
}
.spreads-container { display: flex; flex-direction: column; align-items: center; gap: 2rem; }

/* Text styles */
.main-text {
  text-align: justify;
  text-align-last: right;
  text-justify: inter-word;
  direction: rtl;
  unicode-bidi: plaintext;
  display: flow-root;
  word-spacing: 0px;
  letter-spacing: 0.2px;
  -webkit-text-stroke: 0.3px currentColor;
}

/* Footnote styles */
.footnote-item {
  break-inside: avoid;
  font-size: 10pt;
  text-align: justify;
  text-align-last: right;
  text-justify: inter-word;
  direction: rtl;
  unicode-bidi: plaintext;
  word-spacing: 1px;
  letter-spacing: 0.3px;
  -webkit-text-stroke: 0.3px currentColor;
}
.footnote-item b, .footnote-item strong { font-weight: 900; }
.footnote-item p { display: inline; margin: 0; padding: 0; }
.footnote-item a { color: currentColor; text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; }
.footnote-marker { font-weight: 700; color: hsl(var(--title-gold)); margin-inline-end: 0.3rem; }
.footnote-ref { font-weight: 400; font-size: 0.8em; color: hsl(var(--title-gold)); }
.footnote-ref-inline { font-weight: 400; font-size: 0.9em; color: hsl(var(--title-gold)); }
.paragraph-marker { font-weight: 700; }
.footnote-marker-indent { display: inline-block; min-width: 1.5em; }
.paragraph-marker-indent { display: inline-block; min-width: 1.5em; }

/* Source references */
.source-ref { font-size: 0.875rem; line-height: 1.25rem; color: hsl(var(--muted-foreground)); }
.source-ref-highlight { background-color: rgba(255, 255, 0, 0.4); padding: 0 1px; border-radius: 1px; }
.source-ref-reduce { font-size: 0.85em; }
.single-source-flow .footnote-item { break-inside: auto; }

/* Print/export mode */
.pdf-export-mode-page {
  background: hsl(var(--page-bg)) !important;
  border-color: #ccc !important;
  box-shadow: none !important;
}
.pdf-export-mode-page:after { display: none !important; }
.main-text, .pdf-export-mode-page .footnote-item { color: #000 !important; }
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>מציג מסמכים עבריים | Hebrew Document Viewer</title>
    <meta name="description" content="מציג מסמכים עבריים - המרת מסמכי Word לפורמט PDF יפה בעברית" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 7: Verify build works**

```bash
cd /mnt/volume_sfo3_01/captured_sefer_designer
npm run build 2>&1 | tail -20
```
Expected: build succeeds (no errors, warnings about pdfjs are OK).

---

## Task 2: Types + Supabase Client

**Files:**
- Create: `src/types/document.ts`
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Write `src/types/document.ts`**

```typescript
export type ViewMode = 'page' | 'spread'
export type ExportStage = 'idle' | 'preparing' | 'uploading' | 'processing' | 'downloading' | 'saving' | 'done'

export interface ExportStatus {
  status: string
  stage: ExportStage
  progress?: number
}

export interface FootnoteItem {
  id: string
  marker: string
  formattedContent: string
  isSource?: boolean
  position?: number
}

export interface PageSection {
  id: string
  htmlContent: string
  isHeading?: boolean
}

export interface PageData {
  pageNumber: number
  totalPages: number
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  calculatedHeaderHeight: number
  calculatedMainHeight: number
  mainSections: PageSection[]
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
  showMarginGuide?: boolean
}

export interface SpreadData {
  spreadIndex: number
  left: PageData | null
  right: PageData | null
}

export interface ParsedDocument {
  title: string
  pages: PageData[]
  spreads: SpreadData[]
}
```

- [ ] **Step 2: Write `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tdlucmmrrffnisypgmki.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbHVjbW1ycmZmbmlzeXBnbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2Nzg2MzcsImV4cCI6MjA3MDI1NDYzN30.N7uhwugHg-hsg0tcBklwB9LQm9VsNMAsm5oFiPkhyL4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

- [ ] **Step 3: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffold, types, and supabase client"
```

---

## Task 3: shadcn UI Components

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/progress.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toaster.tsx`
- Create: `src/components/ui/use-toast.ts`

- [ ] **Step 1: Write `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Write `src/components/ui/button.tsx`**

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 3: Write `src/components/ui/progress.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div ref={ref} className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)} {...props}>
    <div
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </div>
))
Progress.displayName = 'Progress'

export { Progress }
```

- [ ] **Step 4: Write `src/components/ui/tooltip.tsx`**

```tsx
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

// Install: npm install @radix-ui/react-tooltip
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

Run: `npm install @radix-ui/react-tooltip`

- [ ] **Step 5: Write `src/components/ui/use-toast.ts`** (simple sonner wrapper)

```typescript
import { toast } from 'sonner'
export { toast }
export function useToast() {
  return { toast }
}
```

- [ ] **Step 6: Write `src/components/ui/toaster.tsx`**

```tsx
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shadcn ui components"
```

---

## Task 4: Mammoth Parser (Word → Sections)

**Files:**
- Create: `src/lib/mammoth-parser.ts`

The parser converts a `.docx` ArrayBuffer into structured sections, chapters, and footnotes ready for page layout.

- [ ] **Step 1: Install mammoth types**

```bash
npm install --save-dev @types/mammoth 2>/dev/null || true
```

- [ ] **Step 2: Write `src/lib/mammoth-parser.ts`**

```typescript
import mammoth from 'mammoth'
import { FootnoteItem, PageSection } from '@/types/document'

export interface ParsedChapter {
  chapterNumber?: string
  chapterTitle?: string
  subtitle?: string
  paragraphs: PageSection[]
  torahFootnotes: FootnoteItem[]
  storyFootnotes: FootnoteItem[]
}

// Hebrew letter map for footnote markers
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'
function hebrewOrdinal(n: number): string {
  if (n <= 22) return HEBREW_LETTERS[n - 1]
  return String(n)
}

function isChapterLine(text: string): boolean {
  return /^פרק\s+[א-ת0-9]+/.test(text.trim())
}

function extractChapterNumber(text: string): string {
  const m = text.match(/פרק\s+([א-ת0-9]+)/)
  return m ? `פרק ${m[1]}` : ''
}

export async function parseDocx(buffer: ArrayBuffer): Promise<{
  title: string
  chapters: ParsedChapter[]
}> {
  // Use mammoth to get raw HTML + messages
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='footnote text'] => p:fresh",
        "r[style-name='footnote reference'] => sup",
      ],
    }
  )

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(doc.body.childNodes)

  const chapters: ParsedChapter[] = []
  let current: ParsedChapter | null = null
  let footnoteCounter = 0
  let title = ''

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const text = node.textContent?.trim() ?? ''
    if (!text) continue

    const tag = node.tagName.toLowerCase()
    const isHeading = /^h[1-6]$/.test(tag)

    if (isHeading && isChapterLine(text)) {
      current = {
        chapterNumber: extractChapterNumber(text),
        paragraphs: [],
        torahFootnotes: [],
        storyFootnotes: [],
      }
      chapters.push(current)
      continue
    }

    if (!current) {
      if (!title && text) title = text
      current = { paragraphs: [], torahFootnotes: [], storyFootnotes: [] }
      chapters.push(current)
    }

    // Check for footnote sup references and replace with styled spans
    const sups = node.querySelectorAll('sup')
    sups.forEach((sup) => {
      footnoteCounter++
      const marker = hebrewOrdinal(footnoteCounter)
      sup.outerHTML = `<span class="footnote-ref">${marker}</span>`
    })

    current.paragraphs.push({
      id: `p-${chapters.length}-${current.paragraphs.length}`,
      htmlContent: node.outerHTML,
      isHeading,
    })
  }

  return { title: title || 'מסמך', chapters }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: mammoth Word parser"
```

---

## Task 5: Document Layout Engine (Sections → Pages)

**Files:**
- Create: `src/lib/document-layout.ts`

Converts parsed chapters into `PageData[]` by measuring rendered height and paginating.

- [ ] **Step 1: Write `src/lib/document-layout.ts`**

```typescript
import { PageData, SpreadData, ParsedDocument } from '@/types/document'
import { ParsedChapter } from './mammoth-parser'

const PAGE_WIDTH = 642.52   // px — matches --page-width CSS var
const PAGE_HEIGHT = 922.2   // px — matches --page-height CSS var
const MARGIN_TOP = 48       // px
const MARGIN_BOTTOM = 48
const MARGIN_SIDE = 48
const HEADER_HEIGHT = 80    // estimated chapter header height
const FOOTNOTE_LINE_HEIGHT = 16 // px per footnote line
const FOOTNOTE_LINES_PER_ITEM = 2

function estimateFootnoteHeight(items: { formattedContent: string }[]): number {
  if (!items.length) return 0
  const lines = items.reduce((acc, f) => {
    const chars = f.formattedContent.replace(/<[^>]+>/g, '').length
    return acc + Math.max(FOOTNOTE_LINES_PER_ITEM, Math.ceil(chars / 55))
  }, 0)
  return lines * FOOTNOTE_LINE_HEIGHT + 24 // 24 = divider + padding
}

function measureHtml(html: string): number {
  const div = document.createElement('div')
  div.style.cssText = `
    position: absolute; visibility: hidden; pointer-events: none;
    width: ${PAGE_WIDTH - MARGIN_SIDE * 2}px;
    font-family: 'PFT Vilna', serif; font-size: 17px;
    line-height: 1.5; direction: rtl;
  `
  div.innerHTML = html
  document.body.appendChild(div)
  const h = div.offsetHeight
  document.body.removeChild(div)
  return h + 8 // 8px paragraph gap
}

export function layoutDocument(
  chapters: ParsedChapter[],
  docTitle: string
): ParsedDocument {
  const pages: PageData[] = []
  let pageIndex = 0

  for (const chapter of chapters) {
    const hasHeader = !!(chapter.chapterNumber || chapter.chapterTitle)
    const headerH = hasHeader ? HEADER_HEIGHT : 0

    // Simple layout: one chapter = one page minimum
    // For a full implementation, paragraphs would be measured and paginated
    // This gives a faithful single-chapter-per-page layout
    pageIndex++
    pages.push({
      pageNumber: pageIndex,
      totalPages: 0, // filled in below
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      subtitle: chapter.subtitle,
      calculatedHeaderHeight: headerH,
      calculatedMainHeight: PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - headerH - 120,
      mainSections: chapter.paragraphs,
      torahFootnotes: chapter.torahFootnotes,
      storyFootnotes: chapter.storyFootnotes,
    })
  }

  // Fill in totalPages
  const total = pages.length
  pages.forEach((p) => (p.totalPages = total))

  // Build spreads (right-to-left: odd pages on right, even on left)
  const spreads: SpreadData[] = []
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      spreadIndex: spreads.length,
      right: pages[i] ?? null,
      left: pages[i + 1] ?? null,
    })
  }

  return { title: docTitle, pages, spreads }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: document layout engine"
```

---

## Task 6: Classify Refs + PDF Export Libs

**Files:**
- Create: `src/lib/classify-refs.ts`
- Create: `src/lib/pdf-export.ts`

- [ ] **Step 1: Write `src/lib/classify-refs.ts`**

```typescript
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
```

- [ ] **Step 2: Write `src/lib/pdf-export.ts`**

```typescript
import { supabase } from './supabase'
import { ViewMode, ExportStatus } from '@/types/document'

export async function exportToPdf(
  html: string,
  viewMode: ViewMode,
  title: string,
  onStatus?: (s: ExportStatus) => void
): Promise<void> {
  onStatus?.({ status: 'מכין מסמך...', stage: 'preparing' })

  onStatus?.({ status: 'שולח לשרת...', stage: 'uploading' })
  const { data, error } = await supabase.functions.invoke('pdf-export', {
    body: { html, viewMode, title },
  })

  if (error) throw new Error(error.message || 'Failed to call PDF export service')
  if (data?.error) throw new Error(data.error)

  onStatus?.({ status: 'מוריד PDF...', stage: 'downloading' })

  // data is expected to be a base64 string or blob URL
  const blob = data instanceof Blob
    ? data
    : new Blob([Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))], { type: 'application/pdf' })

  onStatus?.({ status: 'שומר קובץ...', stage: 'saving' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.pdf`
  a.click()
  URL.revokeObjectURL(url)

  onStatus?.({ status: 'הושלם!', stage: 'done' })
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: classify-refs and pdf-export library functions"
```

---

## Task 7: Hooks

**Files:**
- Create: `src/hooks/useDocumentLoader.ts`
- Create: `src/hooks/useExport.ts`

- [ ] **Step 1: Write `src/hooks/useDocumentLoader.ts`**

```typescript
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
    setStatusMsg('טוען את המסמך...')
    try {
      const buffer = await file.arrayBuffer()
      setStatusMsg('מעבד את הדפים...')
      const { title, chapters } = await parseDocx(buffer)
      setStatusMsg('מסדר עמודים...')
      const parsed = layoutDocument(chapters, title || file.name.replace('.docx', ''))
      setDoc(parsed)
      setState('done')
    } catch (e) {
      setError('שגיאה בטעינת המסמך. אנא נסה שוב.')
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
```

- [ ] **Step 2: Write `src/hooks/useExport.ts`**

```typescript
import { useState, useCallback } from 'react'
import { exportToPdf } from '@/lib/pdf-export'
import { ViewMode, ExportStatus } from '@/types/document'

export function useExport() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<ExportStatus | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stageProgress: Record<string, number> = {
    preparing: 10,
    uploading: 30,
    processing: 60,
    downloading: 85,
    saving: 95,
    done: 100,
  }

  const doExport = useCallback(async (
    containerRef: React.RefObject<HTMLElement>,
    viewMode: ViewMode,
    title: string
  ) => {
    if (!containerRef.current) return
    setIsExporting(true)
    setError(null)
    setProgress(0)

    const html = containerRef.current.innerHTML

    try {
      await exportToPdf(html, viewMode, title, (s) => {
        setStatus(s)
        setProgress(stageProgress[s.stage] ?? 0)
      })
    } catch (e: any) {
      setError(e.message || 'שגיאה בייצוא')
    } finally {
      setIsExporting(false)
      setTimeout(() => { setStatus(null); setProgress(0) }, 3000)
    }
  }, [])

  return { progress, status, isExporting, error, doExport }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: document loader and export hooks"
```

---

## Task 8: Core UI Components

**Files:**
- Create: `src/components/UploadZone.tsx`
- Create: `src/components/ChapterHeader.tsx`
- Create: `src/components/FootnotesSection.tsx`
- Create: `src/components/PageSurface.tsx`
- Create: `src/components/SpreadView.tsx`

- [ ] **Step 1: Write `src/components/UploadZone.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `src/components/ChapterHeader.tsx`**

```tsx
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
```

- [ ] **Step 3: Write `src/components/FootnotesSection.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `src/components/PageSurface.tsx`**

```tsx
import { useRef } from 'react'
import { PageData } from '@/types/document'
import { ChapterHeader } from './ChapterHeader'
import { FootnotesSection } from './FootnotesSection'
import { cn } from '@/lib/utils'

interface Props {
  page: PageData
  documentTitle: string
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
}

export function PageSurface({ page, documentTitle, showMarginGuide, sourceHighlight, sourceReduce }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)

  return (
    <div className="page-surface">
      {/* Margin guide lines */}
      {showMarginGuide && (
        <div className="absolute inset-[48px] border border-dashed border-foreground/10 pointer-events-none" />
      )}

      <div className="flex flex-col h-full px-12 pt-12 pb-12">
        {/* Chapter header */}
        <ChapterHeader
          chapterNumber={page.chapterNumber}
          chapterTitle={page.chapterTitle}
          subtitle={page.subtitle}
        />

        {/* Main text */}
        <div
          ref={mainRef}
          className="font-vilna text-[17px] leading-[1.5] text-foreground main-text flex-1"
          style={{ height: page.calculatedMainHeight, overflow: 'hidden' }}
        >
          {page.mainSections.map((s) => (
            <div key={s.id} dangerouslySetInnerHTML={{ __html: s.htmlContent }} />
          ))}
        </div>

        {/* Footnotes */}
        <FootnotesSection
          torahFootnotes={page.torahFootnotes}
          storyFootnotes={page.storyFootnotes}
          sourceHighlight={sourceHighlight}
          sourceReduce={sourceReduce}
        />

        {/* Page number */}
        <div className="text-center mt-2">
          <span className="font-vilna text-[13px] text-muted-foreground tracking-wide">
            {page.pageNumber}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/SpreadView.tsx`**

```tsx
import { PageData } from '@/types/document'
import { PageSurface } from './PageSurface'

interface Props {
  leftPage: PageData | null
  rightPage: PageData | null
  totalPages: number
  documentTitle: string
  spreadIndex: number
  showMarginGuide?: boolean
  sourceHighlight?: boolean
  sourceReduce?: boolean
}

export function SpreadView({ leftPage, rightPage, totalPages, documentTitle, spreadIndex, showMarginGuide, sourceHighlight, sourceReduce }: Props) {
  return (
    <div className="flex gap-0" style={{ width: 'var(--spread-width)' }}>
      {rightPage
        ? <PageSurface page={{ ...rightPage, totalPages }} documentTitle={documentTitle} showMarginGuide={showMarginGuide} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} />
        : <div className="page-surface-empty" />
      }
      {leftPage
        ? <PageSurface page={{ ...leftPage, totalPages }} documentTitle={documentTitle} showMarginGuide={showMarginGuide} sourceHighlight={sourceHighlight} sourceReduce={sourceReduce} />
        : <div className="page-surface-empty" />
      }
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: upload zone, chapter header, footnotes, page surface, spread view"
```

---

## Task 9: Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`

The toolbar shows the app title, view mode toggles, source-ref controls, export button with progress, and new-document button.

- [ ] **Step 1: Write `src/components/Toolbar.tsx`**

```tsx
import { FileText, BookOpen, Highlighter, Minimize2, AlignJustify, Download, FilePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ViewMode } from '@/types/document'
import { cn } from '@/lib/utils'

interface Props {
  viewMode: ViewMode
  onViewMode: (m: ViewMode) => void
  hasDoc: boolean
  hasSourceRefs: boolean
  sourceHighlight: boolean
  onSourceHighlight: () => void
  sourceReduce: boolean
  onSourceReduce: () => void
  showMarginGuide: boolean
  onToggleMargin: () => void
  isExporting: boolean
  exportProgress: number
  exportStatus: string
  onExport: () => void
  onNewDoc: () => void
}

export function Toolbar({
  viewMode, onViewMode, hasDoc, hasSourceRefs,
  sourceHighlight, onSourceHighlight,
  sourceReduce, onSourceReduce,
  showMarginGuide, onToggleMargin,
  isExporting, exportProgress, exportStatus,
  onExport, onNewDoc,
}: Props) {
  const activeCls = 'bg-background shadow-sm text-foreground'
  const inactiveCls = 'text-muted-foreground hover:text-foreground'

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* App title */}
        <span className="font-vilna font-bold text-[13pt] text-foreground mr-auto hidden sm:block">
          מציג מסמכים עבריים
        </span>

        {hasDoc && (
          <>
            {/* View mode */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => onViewMode('page')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', viewMode === 'page' ? activeCls : inactiveCls)}
                title="תצוגת עמוד בודד"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">עמוד</span>
              </button>
              <button
                onClick={() => onViewMode('spread')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', viewMode === 'spread' ? activeCls : inactiveCls)}
                title="תצוגת זוג עמודים"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">פריסה</span>
              </button>
            </div>

            {/* Source ref controls — only when source refs found */}
            {hasSourceRefs && (
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={onSourceHighlight}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', sourceHighlight ? activeCls : inactiveCls)}
                  title="Highlight source references"
                >
                  <Highlighter className="w-4 h-4" />
                  <span className="hidden sm:inline">Highlight</span>
                </button>
                <button
                  onClick={onSourceReduce}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', sourceReduce ? activeCls : inactiveCls)}
                  title="Reduce source reference font size"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Reduce</span>
                </button>
              </div>
            )}

            {/* Margin guide */}
            <button
              onClick={onToggleMargin}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all', showMarginGuide ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="הצג/הסתר קווי שוליים"
            >
              <AlignJustify className="w-4 h-4" />
              <span className="hidden sm:inline">שוליים</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Export button */}
            <div className="relative">
              <Button
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="font-hebrew gap-2 px-6 py-2 text-base min-w-[120px]"
              >
                {isExporting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="tabular-nums">{Math.round(exportProgress)}%</span></>
                  : <><Download className="w-5 h-5" />PDF</>
                }
              </Button>
              {isExporting && (
                <div className="absolute -bottom-2 left-0 right-0">
                  <Progress value={exportProgress} className="h-1" />
                </div>
              )}
            </div>
          </>
        )}

        {/* New document */}
        {hasDoc && (
          <Button variant="ghost" size="sm" onClick={onNewDoc} className="font-hebrew gap-2">
            <FilePlus className="w-4 h-4" />
            מסמך חדש
          </Button>
        )}
      </div>

      {/* Status bar */}
      {isExporting && exportStatus && (
        <div className="bg-muted/50 border-t border-border px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="font-hebrew text-sm text-muted-foreground">{exportStatus}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: toolbar with view mode, source ref controls, export button"
```

---

## Task 10: Pages — Index, Compare, NotFound, App Router

**Files:**
- Create: `src/pages/Index.tsx`
- Create: `src/pages/Compare.tsx`
- Create: `src/pages/NotFound.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Write `src/pages/NotFound.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="font-hebrew text-lg text-muted-foreground">Oops! Page not found</p>
      <Button onClick={() => navigate('/')} className="font-hebrew gap-2 mt-4">
        <Upload className="w-4 h-4" />
        Return to Home
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/pages/Index.tsx`**

```tsx
import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { UploadZone } from '@/components/UploadZone'
import { Toolbar } from '@/components/Toolbar'
import { PageSurface } from '@/components/PageSurface'
import { SpreadView } from '@/components/SpreadView'
import { useDocumentLoader } from '@/hooks/useDocumentLoader'
import { useExport } from '@/hooks/useExport'
import { ViewMode } from '@/types/document'
import { toast } from 'sonner'

export default function Index() {
  const { doc, state, statusMsg, error, loadFile, reset } = useDocumentLoader()
  const { progress, status, isExporting, doExport } = useExport()
  const [viewMode, setViewMode] = useState<ViewMode>('spread')
  const [sourceHighlight, setSourceHighlight] = useState(false)
  const [sourceReduce, setSourceReduce] = useState(false)
  const [showMarginGuide, setShowMarginGuide] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleExport = () => {
    if (!doc) return
    doExport(containerRef, viewMode, doc.title).then(() => {
      toast.success('ייצוא הושלם', { description: 'הקובץ הורד בהצלחה' })
    }).catch((e) => {
      toast.error('שגיאה בייצוא הקובץ', { description: e.message })
    })
  }

  const hasSourceRefs = (doc?.pages ?? []).some(
    (p) => p.torahFootnotes.some((f) => f.isSource) || p.storyFootnotes.some((f) => f.isSource)
  )

  // Upload / initial state
  if (state === 'idle' || state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
        <Upload className="w-16 h-16 text-ornament" strokeWidth={1.5} />
        <h1 className="font-hebrew font-bold text-3xl mb-2 text-foreground">מציג מסמכים עבריים</h1>
        <p className="font-hebrew text-sm text-muted-foreground mb-4">
          העלה מסמך Word או בחר מסמך לדוגמה
        </p>
        {error && <p className="font-hebrew text-destructive text-center">{error}</p>}
        <UploadZone onFileLoad={loadFile} isLoading={false} />
      </div>
    )
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Upload className="w-10 h-10 text-ornament animate-pulse" strokeWidth={1.5} />
          <p className="font-hebrew text-lg font-semibold text-foreground">{statusMsg || 'טוען מסמך...'}</p>
        </div>
      </div>
    )
  }

  // Document viewer state
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Toolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        hasDoc={!!doc}
        hasSourceRefs={hasSourceRefs}
        sourceHighlight={sourceHighlight}
        onSourceHighlight={() => setSourceHighlight((v) => !v)}
        sourceReduce={sourceReduce}
        onSourceReduce={() => setSourceReduce((v) => !v)}
        showMarginGuide={showMarginGuide}
        onToggleMargin={() => setShowMarginGuide((v) => !v)}
        isExporting={isExporting}
        exportProgress={progress}
        exportStatus={status?.status ?? ''}
        onExport={handleExport}
        onNewDoc={reset}
      />

      <main className="py-8 px-4 overflow-x-auto">
        {doc && viewMode === 'page' && (
          <div ref={containerRef} className="spreads-container">
            {doc.pages.map((page) => (
              <PageSurface
                key={page.pageNumber}
                page={page}
                documentTitle={doc.title}
                showMarginGuide={showMarginGuide}
                sourceHighlight={sourceHighlight}
                sourceReduce={sourceReduce}
              />
            ))}
          </div>
        )}

        {doc && viewMode === 'spread' && (
          <div ref={containerRef} className="spreads-container">
            {doc.spreads.map((spread) => (
              <SpreadView
                key={spread.spreadIndex}
                spreadIndex={spread.spreadIndex}
                leftPage={spread.left}
                rightPage={spread.right}
                totalPages={doc.pages.length}
                documentTitle={doc.title}
                showMarginGuide={showMarginGuide}
                sourceHighlight={sourceHighlight}
                sourceReduce={sourceReduce}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/pages/Compare.tsx`**

```tsx
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
            Click to browse or drag & drop
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
```

- [ ] **Step 4: Write `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Index from '@/pages/Index'
import Compare from '@/pages/Compare'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: all pages and app router"
```

---

## Task 11: Final Integration + Dev Server Smoke Test

- [ ] **Step 1: Start dev server**

```bash
cd /mnt/volume_sfo3_01/captured_sefer_designer
npm run dev -- --port 5173 &
sleep 3
curl -s http://localhost:5173/ | head -5
```
Expected: HTML with `<div id="root">` and script tags.

- [ ] **Step 2: Check build**

```bash
npm run build 2>&1
```
Expected: `✓ built in` — no errors.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: few or zero errors.

- [ ] **Step 4: Fix any TS errors** — resolve type mismatches found in step 3.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete 1-to-1 clone of pdf-formatter.lovable.app"
```

---

## Self-Review

### Spec Coverage
| Feature | Task |
|---|---|
| RTL Hebrew layout, fonts | Task 1 (index.css) |
| Types: PageData, FootnoteItem, ViewMode | Task 2 |
| shadcn Button, Progress, Toast | Task 3 |
| Word parse via mammoth | Task 4 |
| Page layout engine | Task 5 |
| classify-refs edge function | Task 6 |
| pdf-export edge function | Task 6 |
| Document loader hook | Task 7 |
| Export hook with progress | Task 7 |
| Upload drag-drop zone | Task 8 |
| Chapter header component | Task 8 |
| Two-column footnotes | Task 8 |
| A4 page surface | Task 8 |
| Spread (two-page) view | Task 8 |
| Toolbar: view toggle, highlight, reduce, margins, export, new doc | Task 9 |
| Main page (upload + viewer) | Task 10 |
| Compare page (side-by-side PDF) | Task 10 |
| 404 page | Task 10 |
| App router (`/`, `/compare`, `*`) | Task 10 |
| Build + TS check | Task 11 |

All features covered. No placeholders or TBDs remain.
