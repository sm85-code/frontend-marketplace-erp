import { useNavigate, useParams } from 'react-router-dom'
import DetailProduk from './katalog/DetailProduk'
export default function KatalogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  return <DetailProduk id={id ?? null} onTutup={() => navigate('/katalog')} />
}
