import { Button } from '@/components/ui/button'
import { useSinkronisasi } from './SinkronisasiProvider'

export default function Sinkronisasi({ jenis, ids = [], akunId, satu = false }: {
  jenis: 'pesanan' | 'katalog' | 'produk' | 'listing'; ids?: string[]; akunId?: string; satu?: boolean
}) {
  const open = useSinkronisasi()
  return <Button variant="outline" onClick={() => open({ jenis, ids: [...ids], akunId, satu })}>Sinkronisasi{satu ? ' item ini' : ''}</Button>
}
