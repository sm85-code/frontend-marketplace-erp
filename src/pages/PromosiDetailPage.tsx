import { useNavigate, useParams } from 'react-router-dom'
import DetailPromosi from './promosi/DetailPromosi'
export default function PromosiDetailPage() {
  const { akun, id } = useParams()
  const navigate = useNavigate()
  return (
    <DetailPromosi
      akun={akun ?? ''}
      id={id ?? ''}
      close={() => navigate('/katalog/promosi')}
    />
  )
}
