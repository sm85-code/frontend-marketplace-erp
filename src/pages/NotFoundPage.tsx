import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-4xl font-bold">404</p>
      <p className="text-muted-foreground">Halaman tidak ditemukan.</p>
      <Button asChild variant="outline">
        <Link to="/pesanan">Kembali ke Pesanan</Link>
      </Button>
    </div>
  )
}
