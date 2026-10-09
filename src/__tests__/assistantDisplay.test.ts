import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import AssistantAnswer from '@/components/AssistantAnswer'
import { aiMoney, aiIncomplete } from '@/lib/assistantDisplay'

describe('assistant results', () => {
 it('uses server exchange rate with no guessed rate on old servers', () => {
  expect(aiMoney('0.0758','18000')).toBe('Rp1.364')
  expect(aiMoney('2','18000')).toBe('Rp36.000')
  expect(aiMoney('0.0758')).toContain('US$')
  expect(aiMoney('bad','18000')).toBe('—')
 })
 it('marks partial and legacy truncated responses incomplete', () => {
  expect(aiIncomplete('partial','Hasil awal')).toBe(true)
  expect(aiIncomplete('completed','Jawaban AI terpotong;')).toBe(true)
  expect(aiIncomplete('completed','Semua selesai')).toBe(false)
 })
 it('renders bold and lists while treating HTML and URLs as inert text', () => {
  const html=renderToStaticMarkup(createElement(AssistantAnswer,{text:'**Toko A**\n\n- Omzet\n- Beban\n<script>alert(1)</script>\n[jahat](javascript:alert(1))'}))
  expect(html).toContain('<strong>Toko A</strong>')
  expect(html).toContain('<ul')
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('href=')
 })
})
