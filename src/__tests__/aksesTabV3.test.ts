import { describe, expect, it } from 'vitest'
import src from '@/pages/RoleAkses.tsx?raw'
import { LETAK_AKSES } from '@/lib/pohonAkses'

describe('per-tab keys v3', () => {
  it('places every new tab key in the tree', () => {
    for (const k of ['iklan_performa', 'iklan_kampanye', 'iklan_gmv', 'iklan_agen', 'iklan_catatan', 'data_template_inv', 'data_template_po', 'arus_kas_rekening', 'laporan_tutup_buku'])
      expect(LETAK_AKSES[k], k).toBeTruthy()
  })
  it('indents tree rows with inline padding so the mobile table css cannot override it', () => {
    expect(src).toMatch(/style=\{\{ paddingLeft: INDENT\[n\.tingkatan\] \}\}/)
  })
})
