import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import type { SaranAiItem } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cara, labelTindakan } from '@/lib/iklanKampanye'

const PRIORITAS = { tinggi: 'destructive', sedang: 'default', rendah: 'secondary' } as const

/** AI review of one shop's campaigns. It only suggests: each suggestion is applied by hand, after a confirmation. */
export default function SaranAi({ akunId, hari }: { akunId: string; hari: number }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selesai, setSelesai] = useState<Set<number>>(new Set())

  const analisis = useMutation({
    mutationFn: () => endpoints.saranAiIklan(akunId, hari),
    onMutate: () => setSelesai(new Set()),
    onError: (e) => toast.error(getApiError(e)),
  })
  const terapkan = useMutation({
    mutationFn: async (s: SaranAiItem) => {
      const c = cara(s)
      if (!c) return
      if (c.jenis === 'aksi') await endpoints.aksiKampanyeIklan(akunId, s.campaign_id, c.payload)
      else await endpoints.kataKunciKampanyeIklan(akunId, s.campaign_id, c.perubahan)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  async function klikTerapkan(s: SaranAiItem, i: number) {
    const ok = await confirm({
      title: 'Terapkan saran AI?',
      description: `${s.nama}\n${labelTindakan(s, fmtRp)}\n\nAlasan AI: ${s.alasan}\n\nPerubahan langsung berlaku di Shopee.`,
      confirmLabel: 'Ya, terapkan',
      destructive: s.tindakan === 'hapus_kata_kunci',
    })
    if (!ok) return
    await terapkan.mutateAsync(s)
    setSelesai((d) => new Set(d).add(i))
    toast.success('Saran diterapkan di Shopee')
    qc.invalidateQueries({ queryKey: ['iklan-kampanye'] })
  }

  const h = analisis.data
  return (
    <section aria-label="Asisten AI" className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Asisten AI</h3>
          <p className="teks-kecil text-muted-foreground">
            AI membaca performa kampanye yang berjalan dan dijeda, lalu memberi saran. Tidak ada yang berubah sebelum Anda menekan Terapkan.
          </p>
        </div>
        <Button onClick={() => analisis.mutate()} disabled={!akunId || analisis.isPending}>
          {analisis.isPending ? 'AI sedang menganalisis…' : 'Minta saran AI'}
        </Button>
      </div>
      {analisis.isPending && <p className="teks-data text-muted-foreground">Biasanya 20–60 detik. Jangan tutup halaman ini.</p>}
      {analisis.error && (
        <p role="alert" className="text-sm text-destructive">
          {getApiError(analisis.error)}
        </p>
      )}
      {h && (
        <div className="space-y-3">
          {h.ringkasan && <p className="rounded-md bg-muted p-3 text-sm">{h.ringkasan}</p>}
          {h.saran.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada saran. Datanya belum cukup atau semuanya sudah baik.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {h.saran.map((s, i) => {
                const bisa = cara(s) !== null
                return (
                  <li key={`${s.campaign_id}-${s.tindakan}-${s.kata ?? ''}-${i}`} className="space-y-1.5 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={PRIORITAS[s.prioritas]}>{s.prioritas}</Badge>
                      <span className="font-medium">{s.nama}</span>
                    </div>
                    <p className="font-semibold">{labelTindakan(s, fmtRp)}</p>
                    <p className="text-muted-foreground">{s.alasan}</p>
                    {bisa &&
                      (selesai.has(i) ? (
                        <Badge variant="secondary">Sudah diterapkan</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={terapkan.isPending} onClick={() => klikTerapkan(s, i)}>
                          Terapkan
                        </Button>
                      ))}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="teks-kecil text-muted-foreground">
            Biaya analisis ini sekitar {fmtRp(h.pemakaian.biaya_rp)} ({h.pemakaian.token_masuk.toLocaleString('id-ID')} token masuk,{' '}
            {h.pemakaian.token_keluar.toLocaleString('id-ID')} keluar
            {h.bulan_ini_usd != null ? `; bulan ini $${h.bulan_ini_usd.toFixed(2)}` : ''}
            {h.kuota_sisa != null ? `; sisa kuota hari ini ${h.kuota_sisa}` : ''}). Saran AI bisa keliru, periksa alasannya sebelum menerapkan.
          </p>
        </div>
      )}
    </section>
  )
}
