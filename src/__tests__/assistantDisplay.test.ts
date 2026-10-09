import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import AssistantAnswer from '@/components/AssistantAnswer'
import { aiMoney, aiIncomplete, mentionedProducts } from '@/lib/assistantDisplay'

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
  expect(html).toMatch(/<strong[^>]*>Toko A<\/strong>/)
  expect(html).toContain('<ul')
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('href=')
 })
})

 it('only links mentioned products from successful catalogue reads and rejects unsafe links', () => {
  const result={items:[{id:'p',item_id:'1234',nama:'Rak',nama_toko:'Toko',url_produk:'https://shopee.co.id/product/5678/1234',foto_utama:'https://cf.shopee.co.id/file/photo'}, {id:'q',item_id:'8888',nama:'Meja',url_produk:'javascript:alert(1)',foto_utama:'data:text/html,test'}]}
  const actions=[{tool:'cari_produk',status:'succeeded',result},{tool:'cari_produk',status:'succeeded',result}]
  expect(mentionedProducts('Rak item_id 1234',actions)).toHaveLength(1)
  expect(mentionedProducts('Rak',actions)[0].url).toBe('https://shopee.co.id/product/5678/1234')
  expect(mentionedProducts('Meja',actions)[0]).toMatchObject({url:null,foto:null})
  expect(mentionedProducts('12345',actions)).toHaveLength(0)
  expect(mentionedProducts('Rak',[{...actions[0],status:'failed'}])).toHaveLength(0)
 })
