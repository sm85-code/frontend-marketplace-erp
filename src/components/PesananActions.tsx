import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCheck, Loader2, PackageCheck, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { pesananApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { PesananOut, StatusPesanan } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { statusPesananLabel } from '@/lib/labels'
import { allowedActions } from '@/lib/pesanan'

const ICON: Record<string, typeof Truck> = {
  to_ship: PackageCheck,
  shipped: Truck,
  completed: CheckCheck,
  cancelled: Ban,
}

export default function PesananActions({ pesanan, size = 'sm' }: { pesanan: PesananOut; size?: 'sm' | 'default' }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const actions = allowedActions(pesanan.status)

  const mutation = useMutation({
    mutationFn: (target: StatusPesanan) => pesananApi.ubahStatus(pesanan.id, target),
    onSuccess: (res) => {
      qc.setQueryData(qk.pesananDetail(res.id), res)
      qc.invalidateQueries({ queryKey: qk.pesananAll })
      qc.invalidateQueries({ queryKey: qk.produk })
      qc.invalidateQueries({ queryKey: qk.ledgerAll })
      toast.success(`Pesanan ${res.id_eksternal}: ${statusPesananLabel(res.status)}`)
      if (res.status === 'to_ship' && !res.tersinkron_marketplace && res.catatan_sinkron) {
        toast.warning(`Sinkron marketplace: ${res.catatan_sinkron}`)
      }
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal mengubah status')),
  })

  if (actions.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {actions.map((a) => {
        const Icon = ICON[a.target] ?? PackageCheck
        const pending = mutation.isPending && mutation.variables === a.target
        return (
          <Button
            key={a.target}
            size={size}
            variant={a.destructive ? 'destructive' : 'outline'}
            disabled={mutation.isPending}
            onClick={async (e) => {
              e.stopPropagation()
              const ok = await confirm({
                title: `${a.label} pesanan ${pesanan.id_eksternal}?`,
                description: a.description,
                confirmLabel: a.label,
                destructive: a.destructive,
              })
              if (ok) mutation.mutate(a.target)
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Icon />}
            {a.label}
          </Button>
        )
      })}
    </div>
  )
}
