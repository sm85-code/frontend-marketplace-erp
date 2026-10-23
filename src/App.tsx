import WorkspaceOverlays from '@/components/WorkspaceOverlays'
import { SinkronisasiSession } from '@/components/SinkronisasiProvider'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { pasangPendengarNotifikasi } from '@/lib/pwa'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Spinner from '@/components/Spinner'
import { AuthProvider, useAuth } from '@/lib/auth'
import type { Tingkat } from '@/api/types'

// Semua kode halaman diunduh diam-diam setelah login, supaya pindah halaman
// tidak perlu menunggu unduhan dulu (service worker lalu menyimpannya).
const pemuatHalaman: (() => Promise<unknown>)[] = []
function muat<T>(loader: () => Promise<T>) {
  pemuatHalaman.push(loader)
  return loader
}
let sudahPrefetch = false
function prefetchSemuaHalaman() {
  if (sudahPrefetch) return
  sudahPrefetch = true
  const koneksi = (navigator as { connection?: { saveData?: boolean } }).connection
  if (koneksi?.saveData) return
  const jalan = async () => {
    for (const loader of pemuatHalaman) {
      try { await loader() } catch { /* dicoba lagi saat halaman dibuka */ }
    }
  }
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void }
  if (w.requestIdleCallback) w.requestIdleCallback(() => void jalan())
  else setTimeout(() => void jalan(), 2000)
}

const EngagementAutomationPage = lazy(muat(() => import('@/pages/EngagementAutomationPage')))
const ShopSettingsPage = lazy(muat(() => import('@/pages/ShopSettingsPage')))
const AssistantPage = lazy(muat(() => import('@/pages/AssistantPage')))
const PerformaTokoPage = lazy(muat(() => import('@/pages/PerformaTokoPage')))
const LoginPage = lazy(muat(() => import('@/pages/LoginPage')))
const GantiPasswordPage = lazy(muat(() => import('@/pages/GantiPasswordPage')))
const ProfilePage = lazy(muat(() => import('@/pages/ProfilePage')))
const DashboardPage = lazy(muat(() => import('@/pages/DashboardPage')))
const AkunPage = lazy(muat(() => import('@/pages/AkunPage')))
const ShopeeCallbackPage = lazy(muat(() => import('@/pages/ShopeeCallbackPage')))
const KatalogDetailPage = lazy(muat(() => import('@/pages/KatalogDetailPage')))
const PromosiDetailPage = lazy(muat(() => import('@/pages/PromosiDetailPage')))
const KatalogPage = lazy(muat(() => import('@/pages/KatalogPage')))
const ProdukPage = lazy(muat(() => import('@/pages/ProdukPage')))
const ListingPage = lazy(muat(() => import('@/pages/ListingPage')))
const GudangPage = lazy(muat(() => import('@/pages/GudangPage')))
const ChatPage = lazy(muat(() => import('@/pages/ChatPage')))
const PesananPage = lazy(muat(() => import('@/pages/PesananPage')))
const ReturPage = lazy(muat(() => import('@/pages/ReturPage')))
const PublicationPage = lazy(muat(() => import('@/pages/PublicationPage')))
const PromosiPage = lazy(muat(() => import('@/pages/PromosiPage')))
const PesananDetailPage = lazy(muat(() => import('@/pages/PesananDetailPage')))
const DocumentTemplatesPage = lazy(muat(() => import('@/pages/DocumentTemplatesPage')))
const ProcessingPage = lazy(muat(() => import('@/pages/ProcessingPage')))
const ArusKas = lazy(muat(() => import('@/pages/ArusKas')))
const OperasionalUmumPage = lazy(muat(() => import('@/pages/OperasionalUmum')))
const KelolaAplikasiPage = lazy(muat(() => import('@/pages/KelolaAplikasi')))
const OperasionalPackingPage = lazy(muat(() => import('@/pages/OperasionalPacking')))
const FinancialReportsPage = lazy(muat(() => import('@/pages/FinancialReportsPage')))
const SettlementPage = lazy(muat(() => import('@/pages/SettlementPage')))
const IklanPage = lazy(muat(() => import('@/pages/IklanPage')))
const KampanyeDetailPage = lazy(muat(() => import('@/pages/KampanyeDetailPage')))
const IklanDetailPage = lazy(muat(() => import('@/pages/IklanDetailPage')))
const StaffPage = lazy(muat(() => import('@/pages/StaffPage')))
const NotFoundPage = lazy(muat(() => import('@/pages/NotFoundPage')))

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

/** A tapped push notification asks the open window to go to the new order or chat; do it inside the app. */
function PendengarNotifikasi() {
  const navigate = useNavigate()
  useEffect(() => pasangPendengarNotifikasi((alamat) => navigate(alamat)), [navigate])
  return null
}

function Protected({ children, halaman, perlu = 'baca' }: { children: ReactNode; halaman?: string | string[]; perlu?: Tingkat }) {
  const { user, loading, akses, bisa } = useAuth()
  const location = useLocation()
  useEffect(() => {
    if (user && akses) prefetchSemuaHalaman()
  }, [user, akses])
  if (loading) return <PageFallback />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.must_change_password && location.pathname !== '/ganti-password') {
    return <Navigate to="/ganti-password" replace state={{ from: location }} />
  }
  if (!akses) return <PageFallback />
  if (halaman && ![halaman].flat().some((h) => bisa(h, perlu))) return <Navigate to={bisa('dashboard') ? '/dashboard' : '/profile'} replace />
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
              <Route path="/kelola-aplikasi" element={<Protected halaman={["kelola_aplikasi", "kategori_transaksi"]}><LazyPage><KelolaAplikasiPage /></LazyPage></Protected>} />
              <Route path="/kategori-transaksi" element={<Navigate to="/kelola-aplikasi?tab=kategori" replace />} />
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
