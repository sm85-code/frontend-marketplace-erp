import { describe, expect, it } from 'vitest'
import { basicColumns, productionColumns, previewAmounts, sampleAmounts } from '@/pages/templateTable'
import type { TemplateBlock } from '@/api/documentTemplates'
const table = (production: boolean): TemplateBlock => ({id:'t',kind:'table',x:0,y:0,width:698,height:250,text:'',font_size:11,bold:false,align:'left',color:'#172033',image_url:'',columns:production?productionColumns():basicColumns(),row_count:4})
describe('consistent document sample totals', () => {
  it('keeps a simple goods-only table free of unlisted service charges', () => {
    expect(sampleAmounts(table(false)).total).toBe(500000)
    expect(previewAmounts(table(false)).total).toBe('2.000.000')
  })
  it('makes document totals equal the sum of the production components', () => {
    const item=table(true), amounts=sampleAmounts(item), fields=previewAmounts(item)
    expect(amounts.total).toBe(amounts.harga_barang+amounts.biaya_pengecatan+amounts.biaya_proses)
    expect(fields.total_harga_barang).toBe('2.000.000')
    expect(fields.total_biaya_pengecatan).toBe('400.000')
    expect(fields.total_biaya_proses).toBe('40.000')
    expect(fields.total).toBe('2.440.000')
    expect(fields.grand_total).toBe(fields.total_total)
  })
})
