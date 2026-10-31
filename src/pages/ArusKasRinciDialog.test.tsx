import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import ArusKasRinciDialog from './ArusKasRinciDialog'
import MoneyInput from '@/components/MoneyInput'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => children,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogHeader: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
  DialogDescription: ({ children }: { children: React.ReactNode }) => children,
  DialogFooter: ({ children }: { children: React.ReactNode }) => children,
}))

describe('cash-flow source selection', () => {
  it('requires manual selection before entering an override, including zero', async () => {
    const onSave = vi.fn()
    let tree!: ReactTestRenderer
    await act(async () => {
      tree = create(<ArusKasRinciDialog target={{ key: 'k_tukang', label: 'Tukang [JOKO]', total: false, period: '26–31 Oct', current: 1150000, manual: false, split: false, sumber: 'otomatis' }} onSave={onSave} onClose={vi.fn()} onClearValue={vi.fn()} onDeleteRow={vi.fn()} onAddSplit={vi.fn()} onAddChild={vi.fn()} />)
    })
    expect(tree.root.findByType(MoneyInput).props.disabled).toBe(true)
    await act(async () => { tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(onSave).toHaveBeenLastCalledWith('Tukang [JOKO]', '1150000', undefined, 'otomatis')
    await act(async () => { tree.root.findByProps({ id: 'rinci-sumber' }).props.onChange({ target: { value: 'manual' } }) })
    expect(tree.root.findByType(MoneyInput).props.disabled).toBe(false)
    await act(async () => { tree.root.findByType(MoneyInput).props.onChange({ target: { value: '0' } }) })
    await act(async () => { tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(onSave).toHaveBeenLastCalledWith('Tukang [JOKO]', '0', undefined, 'manual')
    await act(async () => { tree.unmount() })
  })
})
