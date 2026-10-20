import { useParams } from 'react-router-dom'
import { useTutupHalaman } from '@/lib/riwayat'
import DetailProduk from './katalog/DetailProduk'
export default function KatalogDetailPage() {
  const { id } = useParams()
  const tutup = useTutupHalaman('/katalog')
  return <DetailProduk id={id ?? null} onTutup={tutup} />
}
