import WorkspaceOverlays from '@/components/WorkspaceOverlays'
import { SinkronisasiSession } from '@/components/SinkronisasiProvider'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { pasangPendengarNotifikasi } from '@/lib/pwa'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import LogoApp from '@/components/LogoApp'
import Spinner from '@/components/Spinner'
import { AuthProvider, useAuth } from '@/lib/auth'
import type { Tingkat } from '@/api/types'

const EngagementAutomationPage = lazy(() => import('@/pages/EngagementAutomationPage'))
const ShopSettingsPage = lazy(() => import('@/pages/ShopSettingsPage'))
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
const DocumentTemplatesPage = lazy(() => import('@/pages/DocumentTemplatesPage'))
const ProcessingPage = lazy(() => import('@/pages/ProcessingPage'))
const ArusKas = lazy(() => import('@/pages/ArusKas'))
const OperasionalUmumPage = lazy(() => import('@/pages/OperasionalUmum'))
const KategoriTransaksiPage = lazy(() => import('@/pages/KategoriTransaksi'))
const KelolaAplikasiPage = lazy(() => import('@/pages/KelolaAplikasi'))
const OperasionalPackingPage = lazy(() => import('@/pages/OperasionalPacking'))
const FinancialReportsPage = lazy(() => import('@/pages/FinancialReportsPage'))
const SettlementPage = lazy(() => import('@/pages/SettlementPage'))
const IklanPage = lazy(() => import('@/pages/IklanPage'))
const KampanyeDetailPage = lazy(() => import('@/pages/KampanyeDetailPage'))
const IklanDetailPage = lazy(() => import('@/pages/IklanDetailPage'))
const StaffPage = lazy(() => import('@/pages/StaffPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageFallback() {
  return (
    <div className="page-loader">
      <div className="logo-denyut">
        <LogoApp besar alt="Ampel Kuning" className="size-20" />
      </div>
      <Spinner column size={32} label="Menyiapkan panel..." />
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

/** A tapped push notification asks the open window to go to the new order or chat; do it inside the app. */
function PendengarNotifikasi() {
  const navigate = useNavigate()
  useEffect(() => pasangPendengarNotifikasi((alamat) => navigate(alamat)), [navigate])
  return null
}

function Protected({ children, halaman, perlu = 'baca' }: { children: ReactNode; halaman?: string; perlu?: Tingkat }) {
  const { user, loading, akses, bisa } = useAuth()
  const location = useLocation()
  if (loading) return <PageFallback />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.must_change_password && location.pathname !== '/ganti-password') {
    return <Navigate to="/ganti-password" replace state={{ from: location }} />
  }
  if (!akses) return <PageFallback />
  if (halaman && !bisa(halaman, perlu)) return <Navigate to={bisa('dashboard') ? '/dashboard' : '/profile'} replace />
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
              <Route path="/asisten" element={<Protected halaman="asisten"><LazyPage><AssistantPage /></LazyPage></Protected>} />
              <Route path="/otomasi-produk" element={<Protected halaman="otomasi"><LazyPage><EngagementAutomationPage /></LazyPage></Protected>} />
              <Route path="/pengaturan-toko" element={<Protected halaman="info_toko"><LazyPage><ShopSettingsPage /></LazyPage></Protected>} />
              <Route path="/performa-toko" element={<Protected halaman="info_toko"><LazyPage><PerformaTokoPage /></LazyPage></Protected>} />
              <Route path="/processing/template" element={<Protected halaman="data_template"><LazyPage><DocumentTemplatesPage /></LazyPage></Protected>} />
              <Route path="/processing/*" element={<Protected><LazyPage><ProcessingPage /></LazyPage></Protected>} />
              <Route path="/operasional-umum" element={<Protected halaman="operasional_umum"><LazyPage><OperasionalUmumPage /></LazyPage></Protected>} />
              <Route path="/kelola-aplikasi" element={<Protected halaman="kelola_aplikasi"><LazyPage><KelolaAplikasiPage /></LazyPage></Protected>} />
              <Route path="/kategori-transaksi" element={<Protected halaman="kategori_transaksi"><LazyPage><KategoriTransaksiPage /></LazyPage></Protected>} />
              <Route path="/operasional-packing" element={<Protected halaman="operasional_packing"><LazyPage><OperasionalPackingPage /></LazyPage></Protected>} />
              <Route path="/arus-kas" element={<Protected halaman="arus_kas"><LazyPage><ArusKas /></LazyPage></Protected>} />
              <Route path="/laporan-keuangan/*" element={<Protected halaman="laporan_keuangan"><LazyPage><FinancialReportsPage /></LazyPage></Protected>} />
              <Route path="/dashboard" element={<Protected halaman="dashboard"><LazyPage><DashboardPage /></LazyPage></Protected>} />
              <Route path="/toko" element={<Protected halaman="kelola_toko"><LazyPage><AkunPage /></LazyPage></Protected>} />
              <Route
                path="/katalog"
                element={<Protected halaman="katalog"><LazyPage><KatalogPage /></LazyPage></Protected>}
              />
              <Route path="/katalog/:id" element={<Protected halaman="katalog"><LazyPage><KatalogDetailPage /></LazyPage></Protected>} />
              <Route path="/katalog/promosi/:akun/:id" element={<Protected halaman="promosi"><LazyPage><PromosiDetailPage /></LazyPage></Protected>} />
              <Route
                path="/produk"
                element={<Protected halaman="produk"><LazyPage><ProdukPage /></LazyPage></Protected>}
              />
              <Route
                path="/listing"
                element={<Protected halaman="listing"><LazyPage><ListingPage /></LazyPage></Protected>}
              />
              <Route
                path="/gudang"
                element={<Protected halaman="gudang"><LazyPage><GudangPage /></LazyPage></Protected>}
              />
              <Route path="/chat" element={<Protected halaman="chat"><LazyPage><ChatPage /></LazyPage></Protected>} />
              <Route path="/pesanan" element={<Protected halaman="pesanan"><LazyPage><PesananPage /></LazyPage></Protected>} />
              <Route path="/pesanan/retur" element={<Protected halaman="retur"><LazyPage><ReturPage /></LazyPage></Protected>} />
              <Route path="/katalog/publikasi" element={<Protected halaman="publikasi"><LazyPage><PublicationPage /></LazyPage></Protected>} />
              <Route path="/katalog/promosi" element={<Protected halaman="promosi"><LazyPage><PromosiPage /></LazyPage></Protected>} />
              <Route
                path="/pesanan/:id"
                element={<Protected halaman="pesanan"><LazyPage><PesananDetailPage /></LazyPage></Protected>}
              />
              <Route
                path="/settlement"
                element={<Protected halaman="settlement"><LazyPage><SettlementPage /></LazyPage></Protected>}
              />
              <Route
path="/iklan"
                element={<Protected halaman="iklan"><LazyPage><IklanPage /></LazyPage></Protected>}
              />
              <Route path="/iklan/toko/:akun/kampanye/:id" element={<Protected halaman="iklan"><LazyPage><KampanyeDetailPage /></LazyPage></Protected>} />
              <Route
                path="/iklan/:id"
                element={<Protected halaman="iklan"><LazyPage><IklanDetailPage /></LazyPage></Protected>}
              />
              <Route
                path="/staff"
                element={<Protected halaman="kelola_pengguna"><LazyPage><StaffPage /></LazyPage></Protected>}
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
            </Routes>
            <PendengarNotifikasi />
            <WorkspaceOverlays/>
          </SinkronisasiSession></AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  )
}
