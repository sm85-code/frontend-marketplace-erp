import { pasangTandaGeser } from '@/lib/tandaGeser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import MultilineText from '@/components/MultilineText'
import { ConfirmProvider } from '@/components/ConfirmProvider'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/lib/theme'
import '@/index.css'
import { daftarkanServiceWorker, tundaanPembuka } from '@/lib/pwa'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

function mulai() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ConfirmProvider>
            <App />
            <MultilineText />
            <Toaster />
          </ConfirmProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// Every page load keeps its opening screen up long enough for its animation to be seen.
const tunda = tundaanPembuka(performance.now())
if (tunda > 0) setTimeout(mulai, tunda)
else mulai()

daftarkanServiceWorker()

if (typeof window !== 'undefined') pasangTandaGeser()
