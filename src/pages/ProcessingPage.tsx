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
import Spinner from '@/components/Spinner'

export default function ProcessingPage() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
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
  if (!allowed) return <p role="alert">Processing hanya dapat diakses admin.</p>
  const data = q.data?.data
  const page = location.pathname.replace(/^\/processing\/?/, '').replace(/\/$/, '')
  const pages = {
    pemetaan: { title: 'Pemetaan Order', description: 'Kelola pengerjaan pesanan dari produksi hingga siap kirim.', content: <ProcessingWorkflow catalog={data} /> },
    'tukang-kayu': { title: 'Tukang Kayu', description: 'Kelola kontak, rekening, dan keahlian tukang kayu.', content: <ProcessingParties kind="tukang" items={data?.tukang || []} /> },
    'produk-kayu': { title: 'Katalog Produk Kayu', description: 'Kelola struktur produk, ukuran, dan harga produksi.', content: <ProcessingPrices kind="produksi" /> },
    supplier: { title: 'Supplier', description: 'Kelola kontak dan rekening supplier.', content: <ProcessingParties kind="supplier" items={data?.supplier || []} /> },
    'katalog-siabumdes': { title: 'Katalog Siabumdes', description: 'Lihat harga jual dan stok produk dari Siabumdes.', content: <SupplierCatalogPanel /> },
    'katalog-manual': { title: 'Katalog Supplier Manual', description: 'Kelola produk dan harga beli supplier secara manual.', content: <ProcessingPrices kind="non_kayu" /> },
    'tarif-pengecatan': { title: 'Tarif Pengecatan', description: 'Kelola tarif pengecatan berdasarkan produk, ukuran, dan warna.', content: <ProcessingPrices kind="pengecatan" /> },
    'tarif-packing': { title: 'Tarif Packing', description: 'Kelola tarif packing biasa dan packing kayu.', content: <ProcessingPrices kind="packing" /> },
  }
  const selected = pages[page as keyof typeof pages]
  if (!selected && !privateKey) return <Navigate to="/processing/pemetaan" replace />
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
