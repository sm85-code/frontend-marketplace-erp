import { describe, expect, it } from 'vitest'
import { copyInvDesign, defaults } from '@/pages/templateDocumentModel'
import type { TemplateBlock } from '@/api/documentTemplates'

const inv = defaults('INV')

describe('copyInvDesign (tombol Salin desain INV di tab PO)', () => {
  it('memakai desain INV tersimpan apa adanya dengan ID baru', () => {
    const copied = copyInvDesign({ blocks: inv, orientation: 'landscape' })
    expect(copied.orientation).toBe('landscape')
    expect(copied.blocks).toHaveLength(inv.length)
    expect(copied.blocks.map(({ id: _id, ...design }) => design)).toEqual(
      inv.map(({ id: _id, ...design }) => design),
    )
    expect(copied.blocks.every((b) => !inv.some((source) => source.id === b.id))).toBe(true)
    expect(copied.blocks.map((b) => b.id)).not.toEqual(inv.map((b) => b.id))
    expect(new Set(copied.blocks.map((b) => b.id)).size).toBe(inv.length)
    expect(copied.blocks[0]).not.toBe(inv[0])
  })

  it('memakai desain bawaan INV kalau INV belum pernah disimpan', () => {
    for (const sumber of [undefined, null, { blocks: null }, { blocks: [] }]) {
      const copied = copyInvDesign(sumber)
      expect(copied.orientation).toBe('portrait')
      expect(copied.blocks).toHaveLength(inv.length)
      expect(copied.blocks.map(({ id: _id, ...design }) => design)).toEqual(
        inv.map(({ id: _id, ...design }) => design),
      )
      expect(new Set(copied.blocks.map((b) => b.id)).size).toBe(inv.length)
    }
  })

  it('mempertahankan orientasi saat memakai desain bawaan', () => {
    expect(copyInvDesign({ blocks: [], orientation: 'landscape' }).orientation).toBe('landscape')
    expect(copyInvDesign({ orientation: 'invalid' }).orientation).toBe('portrait')
  })

  it('menyalin pengaturan dan kolom tabel tanpa berbagi referensi', () => {
    const table: TemplateBlock = {
      ...inv.find((b) => b.kind === 'table')!,
      name: 'Rincian',
      hidden: true,
      locked: true,
      row_count: 8,
      show_totals: true,
      border: false,
      columns: [{
        field: 'nama', label: 'Barang', width: 50, align: 'left',
        header_background: '#ffffff', header_color: '#000000', total: false,
      }],
    }
    const source = structuredClone(table)
    const first = copyInvDesign({ blocks: [table] })
    const second = copyInvDesign({ blocks: [table] })
    expect(first.blocks[0]).toEqual({ ...source, id: first.blocks[0].id })
    expect(first.blocks[0].id).not.toBe(second.blocks[0].id)
    expect(first.blocks[0].columns).not.toBe(table.columns)
    expect(first.blocks[0].columns![0]).not.toBe(table.columns![0])
    first.blocks[0].columns![0].label = 'Diubah'
    first.blocks[0].columns!.pop()
    expect(table).toEqual(source)
    expect(second.blocks[0].columns).toEqual(source.columns)
  })

  it('tidak mengubah desain sumber', () => {
    const own = defaults('PO')
    const copied = copyInvDesign({ blocks: own, orientation: 'portrait' })
    copied.blocks[0].x = 999
    expect(own[0].x).not.toBe(999)
    copied.blocks.pop()
    expect(own).toHaveLength(defaults('PO').length)
  })
})
