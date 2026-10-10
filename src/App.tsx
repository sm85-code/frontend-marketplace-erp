import { SinkronisasiSession } from '@/components/SinkronisasiProvider'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Spinner from '@/components/Spinner'
import { ROLES_ADMIN_ONLY, ROLES_OWNER_ONLY } from '@/config/roles'
import { AuthProvider, useAuth } from '@/lib/auth'
import type { Role } from '@/api/types'

const AssistantPage = lazy(() => import('@/pages/AssistantPage'))
const PerformaTokoPage = lazy(() => import('@/pages/PerformaTokoPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const GantiPasswordPage = lazy(() => import('@/pages/GantiPasswordPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AkunPage = lazy(() => import('@/pages/AkunPage'))
const ShopeeCallbackPage = lazy(() => import('@/pages/ShopeeCallbackPage'))
const KatalogDetailPage = lazy(() => import('@/pages/KatalogDetailPage'))
const PromosiDetailPage = lazy(() => import('@/pages/PromosiDetailPage'))
const KatalogPage = lazy(() => import('@/pages/KatalogPage'))
const ProdukPage = lazy(() => import('@/pages/ProdukPage'))
const ListingPage = lazy(() => import('@/pages/ListingPage'))
const GudangPage = lazy(() => import('@/pages/GudangPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const PesananPage = lazy(() => import('@/pages/PesananPage'))
const ReturPage = lazy(() => import('@/pages/ReturPage'))
const PublicationPage = lazy(() => import('@/pages/PublicationPage'))
const PromosiPage = lazy(() => import('@/pages/PromosiPage'))
const PesananDetailPage = lazy(() => import('@/pages/PesananDetailPage'))
const SettlementPage = lazy(() => import('@/pages/SettlementPage'))
const IklanPage = lazy(() => import('@/pages/IklanPage'))
const KampanyeDetailPage = lazy(() => import('@/pages/KampanyeDetailPage'))
const IklanDetailPage = lazy(() => import('@/pages/IklanDetailPage'))
const StaffPage = lazy(() => import('@/pages/StaffPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageFallback() {
  return (
    <div className="page-loader">
      <Spinner column size={56} label="Menyiapkan panel..." />
    </div>
  )
}

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary context="page">
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageFallback />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.must_change_password && location.pathname !== '/ganti-password') {
    return <Navigate to="/ganti-password" replace state={{ from: location }} />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <div className="App">
      <ErrorBoundary context="app">
        <BrowserRouter>
          <AuthProvider><SinkronisasiSession>
            <Routes>
              <Route path="/login" element={<LazyPage><LoginPage /></LazyPage>} />
              <Route
                path="/oauth/shopee/callback/:akunId/:nonce?"
                element={<LazyPage><ShopeeCallbackPage /></LazyPage>}
              />
              <Route
                path="/ganti-password"
                element={<Protected><LazyPage><GantiPasswordPage /></LazyPage></Protected>}
              />
              <Route path="/profile" element={<Protected><LazyPage><ProfilePage /></LazyPage></Protected>} />
              <Route path="/asisten" element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><AssistantPage /></LazyPage></Protected>} />
              <Route path="/performa-toko" element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><PerformaTokoPage /></LazyPage></Protected>} />
              <Route path="/dashboard" element={<Protected><LazyPage><DashboardPage /></LazyPage></Protected>} />
              <Route path="/toko" element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><AkunPage /></LazyPage></Protected>} />
              <Route
                path="/katalog"
                element={<Protected><LazyPage><KatalogPage /></LazyPage></Protected>}
              />
              <Route path="/katalog/:id" element={<Protected><LazyPage><KatalogDetailPage /></LazyPage></Protected>} />
              <Route path="/katalog/promosi/:akun/:id" element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><PromosiDetailPage /></LazyPage></Protected>} />
              <Route
                path="/produk"
                element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><ProdukPage /></LazyPage></Protected>}
              />
              <Route
                path="/listing"
                element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><ListingPage /></LazyPage></Protected>}
              />
              <Route
                path="/gudang"
                element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><GudangPage /></LazyPage></Protected>}
              />
              <Route path="/chat" element={<Protected><LazyPage><ChatPage /></LazyPage></Protected>} />
              <Route path="/pesanan" element={<Protected><LazyPage><PesananPage /></LazyPage></Protected>} />
              <Route path="/pesanan/retur" element={<Protected><LazyPage><ReturPage /></LazyPage></Protected>} />
              <Route path="/katalog/publikasi" element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><PublicationPage /></LazyPage></Protected>} />
              <Route path="/katalog/promosi" element={<Protected roles={ROLES_OWNER_ONLY}><LazyPage><PromosiPage /></LazyPage></Protected>} />
              <Route
                path="/pesanan/:id"
                element={<Protected><LazyPage><PesananDetailPage /></LazyPage></Protected>}
              />
              <Route
                path="/settlement"
                element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><SettlementPage /></LazyPage></Protected>}
              />
              <Route
path="/iklan"
                element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><IklanPage /></LazyPage></Protected>}
              />
              <Route path="/iklan/toko/:akun/kampanye/:id" element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><KampanyeDetailPage /></LazyPage></Protected>} />
              <Route
                path="/iklan/:id"
                element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><IklanDetailPage /></LazyPage></Protected>}
              />
              <Route
                path="/staff"
                element={<Protected roles={ROLES_ADMIN_ONLY}><LazyPage><StaffPage /></LazyPage></Protected>}
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
            </Routes>
          </SinkronisasiSession></AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  )
}
