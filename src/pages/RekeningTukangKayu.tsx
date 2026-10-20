import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { rekeningTukang } from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'

type Baris = { id: string; no: number; nama: string; jenis: string; bank: string; rekening: string }

/** Accounts that are not craftsmen, so they are not in the Tukang Kayu data. */
const REKENING_LAIN = [
  { id: 'lain-iklan', nama: 'UMAR AL KAMAL', jenis: 'Iklan', bank: 'BRI', rekening: '400501028068531' },
  { id: 'lain-titip-gaji', nama: 'YUYUN AULIA NURJANAH', jenis: 'Titip gaji', bank: 'BRI', rekening: '400501004422509' },
]

/** Fixed order of the craftsmen in the list; anyone not named here follows alphabetically. */
const URUTAN_TUKANG = ['joko wahyono', 'cahyono', 'ai hendarso', 'ahmad nur alim']
const urutanTukang = (nama: string) => {
  const n = nama.trim().toLowerCase()
  const i = URUTAN_TUKANG.findIndex((x) => n === x)
  return i >= 0 ? i : URUTAN_TUKANG.length
}

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

/** Accounts to pay: the craftsmen with an account number (Data Produksi → Tukang Kayu; the backend lists only those), then the other fixed accounts. */
export default function RekeningTukangKayu() {
  const q = useQuery({ queryKey: ['rekening-tukang'], queryFn: rekeningTukang })
  const items: Baris[] = [
    ...(q.data ?? [])
      .sort((a, b) => urutanTukang(a.nama) - urutanTukang(b.nama) || a.nama.localeCompare(b.nama, 'id'))
      .map((t) => ({ id: t.id, nama: t.nama, jenis: 'Tukang kayu', bank: t.nama_bank, rekening: t.no_rekening })),
    ...REKENING_LAIN,
  ].map((r, i) => ({ ...r, no: i + 1 }))
  return (
    <section aria-label="Daftar nomor rekening pembayaran" className="min-w-0 space-y-3">
      <h2 className="text-lg font-semibold">Daftar Nomor Rekening Pembayaran</h2>
      {q.isLoading && <Spinner label="Memuat daftar rekening…" />}
      {q.error && <p role="alert" className="text-sm text-destructive">{getApiError(q.error)}</p>}
      {q.data && <TabelLokal label="Daftar nomor rekening pembayaran" items={items} kolom={kolom} idDari={(r) => r.id} namaDari={(r) => r.nama} minWidth={640} />}
    </section>
  )
}
