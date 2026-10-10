import Spinner from '@/components/Spinner'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/workflows'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import QueryError from '@/components/QueryError'
import { useConfirm } from '@/components/ConfirmProvider'

export default function SengketaForm({
  shop,
  sn,
  disabled,
  onBusy,
  onComplete,
}: {
  shop: string
  sn: string
  disabled: boolean
  onBusy: (busy: boolean) => void
  onComplete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reasonId, setReasonId] = useState(0)
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [evidence, setEvidence] = useState<Record<number, string[]>>({})
  const qc = useQueryClient()
  const confirm = useConfirm()
  const reasons = useQuery({
    queryKey: ['retur', 'reasons', shop, sn],
    queryFn: () => api.disputeReasons(shop, sn),
    enabled: open,
    retry: false,
  })
  const reason = reasons.data?.reasons.find((r) => r.dispute_reason === reasonId)
  const upload = useMutation({
    retry: false,
    mutationFn: ({ file }: { index: number; file: File }) => api.uploadEvidence(shop, sn, file),
    onSuccess: (r, variables) =>
      setEvidence((current) => ({ ...current, [variables.index]: [...(current[variables.index] ?? []), r.url] })),
  })
  const submit = useMutation({
    retry: false,
    mutationFn: () =>
      api.disputeReturn(shop, sn, {
        reason_id: reasonId,
        email,
        text,
        evidence: Object.entries(evidence).map(([index, urls]) => ({ module_index: Number(index), urls })),
      }),
    onSuccess: (r) => {
      onComplete()
      if (r.retur) qc.setQueryData(['retur', 'detail', shop, sn], r.retur)
      void qc.invalidateQueries({ queryKey: ['retur'] })
    },
  })
  const busy = upload.isPending || submit.isPending
  useEffect(() => {
    onBusy(busy)
    return () => onBusy(false)
  }, [busy, onBusy])
  const missing = reason?.evidence_module_list.some((m) => m.is_required && !evidence[m.module_index]?.length)
  async function send() {
    if (disabled || busy || submit.data || submit.error || !reason || missing) return
    if (
      await confirm({
        title: 'Kirim sengketa ke Shopee?',
        description: `Retur ${sn}. Alasan, email dan bukti akan dikirim kepada Shopee untuk peninjauan. Pastikan persyaratan dan foto sesuai. Keputusan ini tidak mengubah stok atau settlement ERP.`,
        destructive: true,
      })
    )
      submit.mutate()
  }
  return (
    <section className="rounded-lg border p-3 space-y-3">
      <Button variant="outline" disabled={disabled || busy} onClick={() => setOpen(true)}>
        Ajukan Sengketa / Unggah Bukti
      </Button>
      {open && (
        <>
          <p className="text-sm text-muted-foreground">
            Pilih alasan yang tersedia langsung dari Shopee, baca persyaratan tiap bagian, lalu unggah foto. Jika sengketa memerlukan video
            atau negosiasi lanjutan, gunakan Seller Centre. Hak dan status pengajuan tetap ditentukan Shopee.
          </p>
          {reasons.error && <QueryError error={reasons.error} retry={reasons.refetch} />}
          {reasons.isFetching && <Spinner column label="Memuat persyaratan sengketa…" />}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
            className="space-y-3"
          >
            <fieldset disabled={disabled || busy || !!submit.data || !!submit.error || reasons.isFetching} className="space-y-3">
              <Label htmlFor="dispute-reason">Alasan dan persyaratan</Label>
              <select
                id="dispute-reason"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={reasonId || ''}
                onChange={(e) => {
                  setReasonId(Number(e.target.value))
                  setEvidence({})
                  upload.reset()
                }}
              >
                <option value="">Pilih alasan Shopee</option>
                {reasons.data?.reasons.map((r) => (
                  <option key={r.dispute_reason} value={r.dispute_reason}>
                    Alasan {r.dispute_reason} — {r.dispute_requirement}
                  </option>
                ))}
              </select>
              {reason && <p className="whitespace-pre-wrap text-sm">{reason.dispute_requirement}</p>}
              <div>
                <Label htmlFor="dispute-email">Email untuk penanganan sengketa</Label>
                <Input id="dispute-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dispute-text">Penjelasan penjual</Label>
                <Textarea id="dispute-text" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              {reason?.evidence_module_list.map((m) => (
                <div key={m.module_index} className="rounded-md border p-3 space-y-2">
                  <Label htmlFor={`evidence-${m.module_index}`}>
                    Bagian {m.module_index}
                    {m.is_required ? ' (wajib)' : ' (opsional)'}
                  </Label>
                  <p className="whitespace-pre-wrap text-sm">{m.requirement}</p>
                  <Input
                    id={`evidence-${m.module_index}`}
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={(evidence[m.module_index]?.length ?? 0) >= 9}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) upload.mutate({ index: m.module_index, file })
                      e.target.value = ''
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG/PNG, maksimal 10 MB/foto. {evidence[m.module_index]?.length ?? 0} foto terunggah.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {evidence[m.module_index]?.map((url, i) => (
                      <Button
                        key={url}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEvidence((current) => ({ ...current, [m.module_index]: current[m.module_index].filter((x) => x !== url) }))
                        }
                      >
                        Hapus foto {i + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={!reason || missing || !!reasons.error}>
                Kirim Sengketa
              </Button>
            </fieldset>
          </form>
          {upload.error && (
            <p role="alert" className="text-destructive break-words">
              {getApiError(upload.error)}
            </p>
          )}
          {submit.error && (
            <p role="alert" className="text-destructive break-words">
              {getApiError(submit.error)} Periksa status di Shopee sebelum mengirim ulang.
            </p>
          )}
          {submit.data && (
            <p role="status" className="break-words">
              Sengketa dikonfirmasi Shopee. {submit.data.warnings.join(' ')}{' '}
              {submit.data.request_id && `Request ID: ${submit.data.request_id}`}
            </p>
          )}
        </>
      )}
    </section>
  )
}
