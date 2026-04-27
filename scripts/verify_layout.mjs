import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const docx = process.env.DOCX || '/root/shefa-yoel/שפע שלמה - שער גמילות חסדים - מוגה.docx'
const url  = process.env.URL  || 'http://localhost:5174/'
const outDir = process.env.OUT || '/tmp/sefer_check'
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))

await page.goto(url)
await page.waitForLoadState('networkidle')
await page.locator('input[type="file"]').first().setInputFiles(docx)
await page.waitForSelector('.page-surface', { timeout: 90000 })
await page.waitForTimeout(2500)

const data = await page.evaluate(() => {
  const surfaces = Array.from(document.querySelectorAll('.page-surface'))
  return surfaces.map((s, i) => {
    const main = s.querySelector('.main-text')
    const bodyMarkers = main
      ? Array.from(main.querySelectorAll('.footnote-ref')).map(e =>
          e.getAttribute('data-marker') ?? (e.textContent?.trim() || '').replace(/^[\[\(]|[\]\)]$/g, ''))
      : []
    const noteItems = Array.from(s.querySelectorAll('.footnote-item'))
    const fittedHeads = noteItems
      .map(it => it.querySelector('.footnote-marker'))
      .filter(Boolean)
      .map(m => m.textContent.replace(/[\[\]\(\)\s]/g, ''))
    const continuations = noteItems.length - fittedHeads.length
    const layoutHints = []
    if (s.querySelector('.grid.grid-cols-2')) layoutHints.push('grid')
    if (s.querySelector('.flow-root')) layoutHints.push('float-L')
    if (s.querySelector('.single-source-flow')) layoutHints.push('single')
    const pageNumEl = s.querySelector(':scope > div > div.text-center.mt-1')
    const pageNumText = pageNumEl?.textContent?.trim() || ''
    return {
      page: i + 1,
      bodyMarkers,
      fittedHeads,
      continuations,
      layoutHints,
      pageNumText,
    }
  })
})

const violations = []
for (const p of data) {
  for (const m of p.bodyMarkers) {
    if (!p.fittedHeads.includes(m)) {
      violations.push({ page: p.page, marker: m, fittedHeads: p.fittedHeads })
    }
  }
}

const summary = {
  totalPages: data.length,
  ironRuleViolations: violations.length,
  violationDetails: violations.slice(0, 30),
  pageNumberFormat: data.slice(0, 12).map(d => d.pageNumText),
  layoutDistribution: data.reduce((acc, d) => {
    const key = d.layoutHints.join(',') || 'none'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {}),
}

writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
writeFileSync(`${outDir}/full.json`, JSON.stringify(data, null, 2))

console.log(JSON.stringify(summary, null, 2))

const N = parseInt(process.env.SCREENSHOTS || '6', 10)
for (let i = 0; i < Math.min(N, data.length); i++) {
  await page.locator('.page-surface').nth(i).screenshot({ path: `${outDir}/page-${String(i + 1).padStart(2, '0')}.png` })
}

await browser.close()
process.exit(violations.length > 0 ? 1 : 0)
