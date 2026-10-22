import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useSinkronisasi } from './SinkronisasiProvider'

export default function Sinkronisasi({ jenis, ids = [], akunId, satu = false, ikon, menu = false, label }: {
  jenis: 'pesanan' | 'katalog' | 'produk' | 'listing'; ids?: string[]; akunId?: string; satu?: boolean
  /** Shown before the label. */
  ikon?: ReactNode
  /** Looks like a row of a menu (inside Aksi lainnya) instead of a button. */
  menu?: boolean
  /** Replaces the default "Sinkronisasi" / "Sinkronisasi item ini". */
  label?: string
}) {
  const open = useSinkronisasi()
  return <Button variant={menu ? 'ghost' : 'outline'} className={menu ? 'w-full justify-start gap-2' : undefined} onClick={() => open({ jenis, ids: [...ids], akunId, satu })}>{ikon}{label ?? `Sinkronisasi${satu ? ' item ini' : ''}`}</Button>
}
