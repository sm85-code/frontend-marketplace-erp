import { afterEach, describe, expect, it, vi } from 'vitest'
import { bukaDokumenResi, pdfDariBase64 } from '@/lib/pesanan'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('shipping documents', () => {
  it('keeps PDF the default for older backends and preserves explicit formats', () => {
    expect(pdfDariBase64(btoa('label')).type).toBe('application/pdf')
    expect(pdfDariBase64(btoa('<html>label</html>'), 'text/html').type).toBe('text/html')
    expect(pdfDariBase64(btoa('archive'), 'application/zip').type).toBe('application/zip')
  })
  it('opens PDF in the reserved tab', () => {
    vi.useFakeTimers()
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:label'), revokeObjectURL: revoke })
    vi.stubGlobal('window', { setTimeout, open: vi.fn() })
    const tab = { location: { href: '' }, close: vi.fn() }
    bukaDokumenResi(new Blob(['%PDF-'], { type: 'application/pdf' }), 'resi.pdf', tab as unknown as Window)
    expect(tab.location.href).toBe('blob:label')
    expect(tab.close).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(revoke).toHaveBeenCalledWith('blob:label')
  })
  it.each(['text/html', 'application/zip'])('downloads %s without executing it in a tab', (type) => {
    vi.useFakeTimers()
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:label'), revokeObjectURL: vi.fn() })
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } })
    vi.stubGlobal('window', { setTimeout, open: vi.fn() })
    const tab = { location: { href: '' }, close: vi.fn() }
    bukaDokumenResi(new Blob(['label'], { type }), 'resi-file', tab as unknown as Window)
    expect(tab.close).toHaveBeenCalledOnce()
    expect(tab.location.href).toBe('')
    expect(link.download).toBe('resi-file')
    expect(link.click).toHaveBeenCalledOnce()
  })
})
