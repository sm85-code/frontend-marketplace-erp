import { qk } from '@/api/keys'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { daftarKampanyeIklan } from '@/api/endpoints'
import KelolaKampanye from './iklan/KelolaKampanye'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
export default function KampanyeDetailPage() {
  const { akun, id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const hari = [7, 14, 28].includes(Number(params.get('hari')))
    ? Number(params.get('hari'))
    : 7
  const data = useQuery({
    queryKey: qk.kampanyeIklan(akun ?? '', hari),
    queryFn: () => daftarKampanyeIklan(akun!, hari),
    enabled: !!akun,
    retry: false,
  })
  const kampanye = data.data?.kampanye.find((k) => k.campaign_id === id)
  if (data.error) return <QueryError error={data.error} retry={data.refetch} />
  if (data.isLoading) return <Spinner column label="Memuat kampanye…" />
  if (!kampanye)
    return (
      <div className="space-y-3">
        <p>Kampanye tidak ditemukan pada periode ini.</p>
        <Button
          variant="outline"
          onClick={() => navigate('/iklan?tab=kampanye')}
        >
          Kembali ke Kampanye
        </Button>
      </div>
    )
  return (
    <KelolaKampanye
      akunId={akun!}
      kampanye={kampanye}
      hari={data.data!.hari}
      biayaShopee={data.data!.biaya_shopee_persen ?? null}
      onTutup={() => navigate('/iklan?tab=kampanye')}
    />
  )
}
