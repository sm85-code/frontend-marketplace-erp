import { useParams } from 'react-router-dom'
import { useTutupHalaman } from '@/lib/riwayat'
import DetailPromosi from './promosi/DetailPromosi'
export default function PromosiDetailPage() {
  const { akun, id } = useParams()
  const tutup = useTutupHalaman('/katalog/promosi')
  return (
    <DetailPromosi
      akun={akun ?? ''}
      id={id ?? ''}
      close={tutup}
    />
  )
}
