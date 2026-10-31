import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import KonflikOperasional from './KonflikOperasional'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const konflik = [{ key: 'rb:k_tukang|2026-10-31', manual: '0', otomatis: 1150000, label: 'Tukang [JOKO]' }]

describe('konflik nilai operasional', () => {
  it('shows both values and only changes data on explicit use of automatic value', async () => {
    const pilih = vi.fn()
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<KonflikOperasional konflik={konflik} onOtomatis={pilih} />) })
    expect(JSON.stringify(tree.toJSON())).toContain('1.150.000')
    expect(JSON.stringify(tree.toJSON())).toContain('JOKO')
    expect(pilih).not.toHaveBeenCalled()
    await act(async () => { tree.root.findByProps({ children: 'Gunakan nilai otomatis' }).props.onClick() })
    expect(pilih).toHaveBeenCalledWith('rb:k_tukang|2026-10-31')
  })
  it('lets the user keep the manual value without saving and exposes conflict again on reload', async () => {
    const pilih = vi.fn()
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<KonflikOperasional konflik={konflik} onOtomatis={pilih} />) })
    await act(async () => { tree.root.findByProps({ children: 'Pertahankan nilai manual' }).props.onClick() })
    expect(pilih).not.toHaveBeenCalled()
    expect(JSON.stringify(tree.toJSON())).toContain('dipertahankan')
  })
})
