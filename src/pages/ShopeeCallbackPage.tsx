import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getApiError } from '@/api/client'
import { oauthApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { OAuthCallbackOut } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtDateTime } from '@/lib/format'
import { parseShopeeCallback } from '@/lib/oauth'

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: OAuthCallbackOut }
  | { kind: 'error'; message: string }

/**
 * Shopee redirects the browser here (`/oauth/shopee/callback/:akunId?code=&shop_id=`).
 * We forward code + shop_id to the BE callback, which exchanges the code for tokens
 * and marks the akun `terhubung`. The code is single-use, so guard against the
 * React StrictMode double effect.
 */
export default function ShopeeCallbackPage() {
  const { akunId = '' } = useParams()
  const location = useLocation()
  const qc = useQueryClient()
  const started = useRef(false)
  const parsed = useMemo(() => parseShopeeCallback(location.search), [location.search])
  const inputError = 'error' in parsed ? parsed.error : !akunId ? 'ID akun tidak ada di URL callback.' : null
  const [result, setResult] = useState<State>({ kind: 'loading' })
  const state: State = inputError && result.kind === 'loading' ? { kind: 'error', message: inputError } : result

  useEffect(() => {
    if (started.current || inputError || 'error' in parsed) return
    started.current = true
    oauthApi
      .shopeeCallback(akunId, parsed)
      .then((data) => {
        setResult({ kind: 'ok', data })
        qc.invalidateQueries({ queryKey: qk.akunAll })
        // Drop the single-use code from the address bar.
        window.history.replaceState(null, '', location.pathname)
      })
      .catch((err) => setResult({ kind: 'error', message: getApiError(err, 'Penukaran token Shopee gagal') }))
  }, [akunId, inputError, parsed, location.pathname, qc])

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hubungkan Shopee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {state.kind === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Menukar kode otorisasi dengan token…
            </p>
          ) : state.kind === 'ok' ? (
            <div className="grid gap-2 text-sm">
              <p className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="size-5" /> Toko berhasil terhubung
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Shop ID</dt>
                <dd className="font-mono">{state.data.id_toko_eksternal ?? '-'}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{state.data.status}</dd>
                <dt className="text-muted-foreground">Token berlaku s/d</dt>
                <dd>{fmtDateTime(state.data.token_kedaluwarsa)}</dd>
              </dl>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <XCircle className="mt-0.5 size-5 shrink-0" /> {state.message}
            </p>
          )}
          <Button asChild variant={state.kind === 'ok' ? 'default' : 'outline'}>
            <Link to="/toko">Kembali ke daftar toko</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
