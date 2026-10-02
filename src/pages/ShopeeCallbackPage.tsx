import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Spinner from '@/components/Spinner'

/** Public redirect target for Shopee OAuth: Shopee sends ?code=&shop_id= (shop account) or
 * ?code=&main_account_id= (main account, one or many shops) here; we forward it to the backend
 * which exchanges it for tokens. */
export default function ShopeeCallbackPage() {
  const { akunId } = useParams<{ akunId: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [jumlahToko, setJumlahToko] = useState(0)

  useEffect(() => {
    const code = params.get('code')
    const shopId = params.get('shop_id')
    const mainAccountId = params.get('main_account_id')
    if (!akunId || !code || (!shopId && !mainAccountId)) {
      setStatus('error')
      setMessage('Parameter OAuth tidak lengkap.')
      return
    }
    endpoints
      .oauthShopeeCallback(akunId, {
        code,
        ...(shopId ? { shop_id: shopId } : { main_account_id: mainAccountId ?? '' }),
      })
      .then((res) => {
        setJumlahToko(res.toko.length)
        setStatus('ok')
        setTimeout(() => navigate('/toko', { replace: true }), 1500)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(getApiError(err))
      })
  }, [akunId, params, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Menghubungkan Shopee</CardTitle>
          {status === 'loading' && <CardDescription>Memproses otorisasi…</CardDescription>}
          {status === 'ok' && (
            <CardDescription>
              Berhasil! {jumlahToko > 1 ? `${jumlahToko} toko terhubung. ` : ''}Mengalihkan ke halaman Toko…
            </CardDescription>
          )}
          {status === 'error' && <CardDescription className="text-destructive">{message}</CardDescription>}
        </CardHeader>
        <CardContent>
          {status === 'loading' && <Spinner column label={null} />}
          {status === 'error' && (
            <Button asChild variant="outline">
              <Link to="/toko">Kembali ke Toko</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
