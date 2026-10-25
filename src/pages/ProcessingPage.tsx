import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getProcessingData, importProcessingData } from '@/api/processing'
import { getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { readProcessingCapsule } from '@/lib/processingImport'
import { BarHalaman } from '@/components/daftar'
import SupplierCatalogPanel from './SupplierCatalogPanel'
import ProcessingPrices from './ProcessingPrices'
import ProcessingParties from './ProcessingParties'
import ProcessingWorkflow from './ProcessingWorkflow'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Spinner from '@/components/Spinner'

function NonKayuTabs() {
  const { bisa } = useAuth()
  const otomatis = bisa('data_katalog_otomatis')
  const manual = bisa('data_katalog_manual')
  return (
    <Tabs defaultValue={manual ? 'manual' : 'otomatis'}>
      <TabsList className="section-tabs">
        {manual && <TabsTrigger value="manual">Katalog Manual</TabsTrigger>}
        {otomatis && <TabsTrigger value="otomatis">Katalog Otomatis</TabsTrigger>}
      </TabsList>
      {otomatis && <TabsContent value="otomatis"><SupplierCatalogPanel /></TabsContent>}
      {manual && <TabsContent value="manual"><ProcessingPrices kind="non_kayu" /></TabsContent>}
    </Tabs>
  )
}

/** The page of the role settings behind each screen: Pemetaan Order, and one page per menu of Data Produksi. */
const HALAMAN_LAYAR: Record<string, string> = {
  pemetaan: 'processing',
  'tukang-kayu': 'data_tukang',
  supplier: 'data_supplier',
  'produk-kayu': 'data_produk_kayu',
  'produk-non-kayu': 'data_katalog_otomatis|data_katalog_manual',
  'tarif-pengecatan': 'data_tarif_pengecatan',
  'tarif-packing': 'data_tarif_packing',
}

export default function ProcessingPage() {
  const { bisa } = useAuth()
  const pertama = Object.keys(HALAMAN_LAYAR).find((k) => bisa(HALAMAN_LAYAR[k]))
  const allowed = !!pertama
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const started = useRef<string | null>(null)
  const privateKey = new URLSearchParams(location.hash.slice(1)).get('import')
  const q = useQuery({ queryKey: ['processing-data'], queryFn: getProcessingData, enabled: allowed })
  const save = useCallback(
    async (payload: unknown) => {
      await importProcessingData(payload)
      await qc.invalidateQueries({ queryKey: ['processing-data'] })
      toast.success('Data Processing sudah tersimpan')
      navigate('/processing/produk-kayu', { replace: true })
    },
    [qc, navigate],
  )
  useEffect(() => {
    if (!allowed || !privateKey || started.current === privateKey) return
    started.current = privateKey
    setBusy(true)
    void readProcessingCapsule(privateKey)
      .then(save)
      .catch((err) => setError(getApiError(err, 'Data Processing belum dapat dimuat. Coba kembali.')))
      .finally(() => setBusy(false))
    // Only an admin opening the explicit private import link triggers this one-time import.
  }, [allowed, privateKey, save])
  if (!allowed) return <p role="alert">Halaman ini hanya dapat diakses pengguna yang diberi akses.</p>
  const data = q.data?.data
  const page = location.pathname.replace(/^\/processing\/?/, '').replace(/\/$/, '')
  const pages = {
    pemetaan: { title: 'Pemetaan Order', description: 'Kelola pengerjaan pesanan dari produksi hingga siap kirim.', content: <ProcessingWorkflow catalog={data} /> },
    'tukang-kayu': { title: 'Tukang Kayu', description: 'Kelola kontak, rekening, dan keahlian tukang kayu.', content: <ProcessingParties kind="tukang" items={data?.tukang || []} /> },
    'produk-kayu': { title: 'Katalog Produk Kayu', description: 'Kelola struktur produk, ukuran, dan harga produksi.', content: <ProcessingPrices kind="produksi" /> },
    supplier: { title: 'Supplier', description: 'Kelola kontak dan rekening supplier.', content: <ProcessingParties kind="supplier" items={data?.supplier || []} /> },
    'produk-non-kayu': {
      title: 'Katalog Produk Non Kayu',
      description: 'Lihat katalog otomatis atau kelola produk supplier secara manual.',
      content: <NonKayuTabs />,
    },
    'tarif-pengecatan': { title: 'Tarif Pengecatan', description: 'Kelola tarif pengecatan berdasarkan model, ukuran, dan warna.', content: <ProcessingPrices kind="pengecatan" /> },
    'tarif-packing': { title: 'Tarif Packing', description: 'Kelola tarif packing biasa dan packing kayu.', content: <ProcessingPrices kind="packing" /> },
  }
  // A user is sent to the first screen their role has, when the one asked for is not theirs.
  if (pertama && HALAMAN_LAYAR[page] && !bisa(HALAMAN_LAYAR[page])) return <Navigate to={`/processing/${pertama}`} replace />
  if (page === 'katalog-siabumdes' || page === 'katalog-manual') return <Navigate to="/processing/produk-non-kayu" replace />
  const selected = pages[page as keyof typeof pages]
  if (!selected && !privateKey) return <Navigate to={`/processing/${pertama}`} replace />
  const current = selected || pages['produk-kayu']
  return (
    <div className="processing-page min-w-0 space-y-4 text-left [&_p]:text-left">
      <BarHalaman judul={current.title} deskripsi={current.description} />
      {busy && <Spinner label="Menyimpan data Processing…" />}
      {error && <p role="alert">{error}</p>}
      {q.isLoading && <Spinner label="Memuat data Processing…" />}
      {q.error && (
        <div role="alert">
          {getApiError(q.error)}
          <Button variant="outline" onClick={() => void q.refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      <section key={page} className="min-w-0">{current.content}</section>
    </div>
  )
}
