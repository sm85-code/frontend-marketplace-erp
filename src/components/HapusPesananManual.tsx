import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import * as endpoints from '@/api/endpoints'
import type { Pesanan } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'

/** Only typed-in orders (Pesanan Manual) may go; marketplace orders are cancelled on the marketplace. The server checks
 * again and refuses while stock, mapping, settlement or cash records still point at the order. */
export function bisaHapusManual(p: Pick<Pesanan, 'platform' | 'status' | 'nomor_resi' | 'resi_dicetak_at' | 'tanggal_kirim'>, role?: string): boolean {
  if (String(p.platform) !== 'manual' || !(role === 'admin' || role === 'owner')) return false
  if (p.status === 'cancelled') return true
  return p.status !== 'shipped' && p.status !== 'completed' && !p.nomor_resi && !p.resi_dicetak_at && !p.tanggal_kirim
}

export const LABEL_HAPUS_MANUAL = 'Hapus pesanan manual'

/** Same trigger look everywhere (detail page and the row's "Aksi lainnya" menu). */
export function TombolHapusManual({ onClick, size = 'default', className = '' }: { onClick: () => void; size?: 'sm' | 'default'; className?: string }) {
  return (
    <Button size={size} variant="outline" className={`text-destructive hover:text-destructive ${className}`} onClick={onClick}>
      <Trash2 className="mr-2 h-4 w-4" />
      {LABEL_HAPUS_MANUAL}
    </Button>
  )
}

export default function HapusPesananManual({ p, onDihapus, size = 'default' }: { p: Pesanan; onDihapus?: () => void; size?: 'sm' | 'default' }) {
  const { user } = useAuth()
  const [buka, setBuka] = useState(false)
  if (!bisaHapusManual(p, user?.role)) return null
  return (
    <>
      <TombolHapusManual size={size} onClick={() => setBuka(true)} />
      <DialogHapusManual p={p} buka={buka} setBuka={setBuka} onDihapus={onDihapus} />
    </>
  )
}

/** The confirmation lives outside any popover so closing the menu never closes the dialog. */
export function DialogHapusManual({ p, buka, setBuka, onDihapus }: { p: Pesanan; buka: boolean; setBuka: (b: boolean) => void; onDihapus?: () => void }) {
  const qc = useQueryClient()
  const [ketik, setKetik] = useState('')
  const mut = useMutation({
    mutationFn: () => endpoints.deletePesanan(p.id, ketik.trim()),
    onSuccess: () => {
      toast.success(`Pesanan ${p.id_eksternal} dihapus`)
      setBuka(false)
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      onDihapus?.()
    },
  })
  useEffect(() => { if (buka) { setKetik(''); mut.reset() } }, [buka]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pesanan {p.id_eksternal}?</DialogTitle>
            <DialogDescription>
              Pesanan manual ini dihapus permanen (tercatat di log). Ketik nomor pesanan <b>{p.id_eksternal}</b> untuk mengonfirmasi.
            </DialogDescription>
          </DialogHeader>
          <Input aria-label="Ketik nomor pesanan" value={ketik} onChange={(e) => setKetik(e.target.value)} autoComplete="off" />
          {mut.error && <p role="alert" className="break-words text-sm text-destructive">{getApiError(mut.error)}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuka(false)}>Batal</Button>
            <Button variant="destructive" disabled={ketik.trim() !== p.id_eksternal || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
