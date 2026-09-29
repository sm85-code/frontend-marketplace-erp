import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/common'
import Layout from '@/components/Layout'
import { useAuth } from '@/lib/auth'
import { CHANGE_PASSWORD_PATH, forcedPasswordRedirect } from '@/lib/redirect'
import { SHOPEE_CALLBACK_ROUTE } from '@/lib/oauth'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'

const AkunPage = lazy(() => import('@/pages/AkunPage'))
const GantiPasswordPage = lazy(() => import('@/pages/GantiPasswordPage'))
const ListingPage = lazy(() => import('@/pages/ListingPage'))
const PesananDetailPage = lazy(() => import('@/pages/PesananDetailPage'))
const PesananPage = lazy(() => import('@/pages/PesananPage'))
const ProdukPage = lazy(() => import('@/pages/ProdukPage'))
const ShopeeCallbackPage = lazy(() => import('@/pages/ShopeeCallbackPage'))
const StokPage = lazy(() => import('@/pages/StokPage'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Memeriksa sesi…" />
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  const forced = forcedPasswordRedirect(user, location.pathname, location.search)
  if (forced) return <Navigate to={forced} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Shopee redirects here with ?code=&shop_id= — public, BE callback is public too. */}
        <Route path={`${SHOPEE_CALLBACK_ROUTE}/:akunId`} element={<ShopeeCallbackPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/pesanan" replace />} />
          <Route path={CHANGE_PASSWORD_PATH} element={<GantiPasswordPage />} />
          <Route path="/toko" element={<AkunPage />} />
          <Route path="/produk" element={<ProdukPage />} />
          <Route path="/listing" element={<ListingPage />} />
          <Route path="/stok" element={<StokPage />} />
          <Route path="/pesanan" element={<PesananPage />} />
          <Route path="/pesanan/:id" element={<PesananDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
