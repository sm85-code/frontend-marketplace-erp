import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { getProcessingData } from '@/api/processing'
import { getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'

type Baris = { id: string; no: number; nama: string; jenis: string; bank: string; rekening: string }

const salin = async (rekening: string) => {
  try {
    await navigator.clipboard.writeText(rekening)
    toast.success('No. rekening disalin')
  } catch {
    toast.error('Gagal menyalin no. rekening. Coba lagi.')
  }
}

const kolom: KolomTabel<Baris>[] = [
  { kunci: 'no', judul: 'No.', sel: (r) => <span className="tabular-nums">{r.no}</span> },
  { kunci: 'nama', judul: 'Nama', tetap: true, sel: (r) => <span className="font-medium">{r.nama}</span> },
  { kunci: 'jenis', judul: 'Jenis Pembayaran', sel: (r) => r.jenis },
  { kunci: 'bank', judul: 'Bank', sel: (r) => r.bank || '—' },
  {
    kunci: 'rekening',
    judul: 'No. Rekening',
    sel: (r) => (
      <div className="flex items-center gap-1">
        <span className="whitespace-nowrap tabular-nums">{r.rekening}</span>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Salin no. rekening ${r.nama}`} title="Salin no. rekening" onClick={() => void salin(r.rekening)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]

/** Bank accounts of the wood craftsmen (Data Produksi → Tukang Kayu) that have an account number, for making payments. */
export default function RekeningTukangKayu() {
  const q = useQuery({ queryKey: ['processing-data'], queryFn: getProcessingData })
  const items: Baris[] = (q.data?.data?.tukang ?? [])
    .filter((t) => !!t.no_rekening?.trim())
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map((t, i) => ({ id: t.id, no: i + 1, nama: t.nama, jenis: 'Tukang kayu', bank: t.nama_bank?.trim() ?? '', rekening: t.no_rekening!.trim() }))
  return (
    <section aria-label="Rekening tukang kayu" className="min-w-0 space-y-3">
      <h2 className="text-lg font-semibold">Rekening Tukang Kayu</h2>
      {q.isLoading && <Spinner label="Memuat rekening tukang…" />}
      {q.error && <p role="alert" className="text-sm text-destructive">{getApiError(q.error)}</p>}
      {q.data && <TabelLokal label="Rekening tukang kayu" items={items} kolom={kolom} idDari={(r) => r.id} namaDari={(r) => r.nama} minWidth={640} />}
    </section>
  )
}
