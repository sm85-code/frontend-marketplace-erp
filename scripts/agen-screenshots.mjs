// Use an existing read-only Playwright installation; artifacts stay in this worktree.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
const origin = 'http://127.0.0.1:4178'
await mkdir('docs/agen-screenshots', { recursive: true })
const evidence = []
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' })
    // Only GET static files on this exact localhost server. Block API, external fonts, writes.
    await context.route('**/*', route => {
      const req = route.request(), url = new URL(req.url())
      return req.method() === 'GET' && url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
    })
    let writes = 0, apiRequests = 0
    context.on('request', req => { if (req.method() !== 'GET') writes++; if (new URL(req.url()).pathname.startsWith('/api/')) apiRequests++ })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    async function capture(suffix, fullPage = true) {
      const contained = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && Array.from(document.querySelectorAll('[role=region]')).every(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth }))
      if (!contained) throw new Error(`${name}/${suffix}: overflow escapes its container`)
      await page.screenshot({ path: `docs/agen-screenshots/${name}-${suffix}.png`, fullPage, animations: 'disabled' })
    }
    await page.goto(`${origin}/preview/agen.html`)
    await page.getByText('Pilih toko secara eksplisit', { exact: false }).waitFor()
    await capture('semua', true)
    await page.getByLabel('Toko', { exact: true }).selectOption('demo')
    await page.getByText('Job mati', { exact: false }).waitFor()
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${name}: horizontal overflow`)
    await capture('toko', true)
    await page.getByLabel('ID item (maksimal 32 digit)', { exact: true }).fill('9')
    await page.getByText('Terjual 7 hari', { exact: true }).waitFor()
    const missing = page.locator('dl > div').filter({ has: page.getByText('Perubahan dilihat 28 hari', { exact: true }) }).getByText('Belum tersedia', { exact: true })
    await missing.waitFor()
    await capture('tren', true)
    await page.getByLabel('Jenis aksi', { exact: true }).selectOption('kata_kunci')
    await page.getByLabel('Kata 1', { exact: true }).fill('kursi rotan')
    await page.getByLabel('Bid kata 1 (Rp)', { exact: true }).fill('300')
    await page.getByLabel('Pencocokan kata 1', { exact: true }).selectOption('exact')
    await capture('kata-kunci', true)
    await page.getByRole('button', { name: 'Edit jadwal 7', exact: true }).click()
    if (await page.getByLabel('ID kampanye jadwal', { exact: true }).inputValue() !== '7') throw new Error('Schedule row not loaded')
    await capture('jadwal', true)
    await page.getByText('Lihat sebelum dan sesudah', { exact: true }).click()
    await capture('audit', true)
    await page.getByLabel('Jenis aksi', { exact: true }).selectOption('anggaran')
    await page.getByLabel('ID kampanye', { exact: true }).fill('7')
    await page.getByLabel('Nilai baru', { exact: true }).fill('55000')
    await page.getByRole('button', { name: '1. Simulasikan aksi', exact: true }).click()
    await page.getByRole('button', { name: '2. Tinjau eksekusi nyata', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('dialog').evaluate(async el => { await Promise.all(el.getAnimations().map(a => a.finished)) })
    if (await page.getByRole('button', { name: 'Ya, konfirmasi', exact: true }).isEnabled()) throw new Error('Missing explicit confirmation gate')
    await capture('konfirmasi', false)
    await page.getByLabel('Ketik ya untuk konfirmasi', { exact: true }).fill('ya')
    await page.getByRole('button', { name: 'Ya, konfirmasi', exact: true }).click()
    await page.getByText('Permintaan selesai.', { exact: true }).waitFor()
    if (errors.length) throw new Error(errors.join('\n'))
    if (writes || apiRequests) throw new Error('Unexpected network API/write request')
    evidence.push({ name, viewport, horizontalOverflow: false, tableOverflowContained: true, browserErrors: errors.length, mockActionConfirmed: true, structuredKeywordEditor: true, scheduleRowLoaded: true, nullTrendPreserved: true, screenshots: 7, networkWrites: writes, apiRequests })
    await context.close()
  }
  await writeFile('docs/agen-screenshots/evidence.json', JSON.stringify(evidence, null, 2) + '\n')
} finally { await browser.close() }
