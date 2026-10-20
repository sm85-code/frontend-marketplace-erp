import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { pushKonfigurasi, pushLangganan, pushStatus, pushUji } from '@/api/push'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { aktifkanPush, iosBelumDipasang, langgananPerangkat, matikanPush, pushDidukung } from '@/lib/push'

/** Turns push notifications on or off for this device, and chooses what it announces (new orders to process, new buyer chats). */
export default function NotifikasiPerangkat() {
  const qc = useQueryClient()
  const didukung = pushDidukung()
  const konfigurasi = useQuery({ queryKey: ['push-konfigurasi'], queryFn: pushKonfigurasi, enabled: didukung, retry: false })
  const status = useQuery({
    queryKey: ['push-status'],
    queryFn: async () => {
      const langganan = await langgananPerangkat()
      return langganan ? pushStatus(langganan.endpoint) : { aktif: false, pesanan: true, chat: true }
    },
    enabled: didukung,
    retry: false,
  })
  const segarkan = () => qc.invalidateQueries({ queryKey: ['push-status'] })
  const nyalakan = useMutation({
    mutationFn: () => aktifkanPush(konfigurasi.data!.kunci_publik!, true, true),
    onSuccess: async () => {
      await segarkan()
      toast.success('Notifikasi diaktifkan di perangkat ini')
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : getApiError(e)),
  })
  const matikan = useMutation({
    mutationFn: matikanPush,
    onSuccess: async () => {
      await segarkan()
      toast.success('Notifikasi dimatikan di perangkat ini')
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  const atur = useMutation({
    mutationFn: async (pilihan: { pesanan: boolean; chat: boolean }) => {
      const langganan = await langgananPerangkat()
      if (!langganan) throw new Error('Perangkat ini belum berlangganan')
      return pushLangganan(langganan.toJSON(), pilihan.pesanan, pilihan.chat)
    },
    onSuccess: () => segarkan(),
    onError: (e) => toast.error(getApiError(e)),
  })
  const uji = useMutation({
    mutationFn: pushUji,
    onSuccess: (hasil) => (hasil.terkirim ? toast.success('Notifikasi uji dikirim. Cek bilah notifikasi perangkat.') : toast.error('Notifikasi uji belum terkirim. Coba matikan lalu aktifkan lagi.')),
    onError: (e) => toast.error(getApiError(e)),
  })

  const aktif = !!status.data?.aktif
  const sibuk = nyalakan.isPending || matikan.isPending || atur.isPending
  let keterangan = 'Dapatkan bunyi dan pemberitahuan di perangkat ini saat ada pesanan baru yang perlu diproses atau chat pembeli baru, walaupun aplikasi tertutup.'
  if (!didukung) keterangan = 'Browser ini belum mendukung notifikasi. Gunakan Chrome di Android, atau pasang aplikasi ke layar utama di iPhone.'
  else if (iosBelumDipasang()) keterangan = 'Di iPhone, pasang aplikasi dulu: Safari → Bagikan → Tambah ke Layar Utama, lalu buka dari ikon itu untuk mengaktifkan notifikasi.'
  else if (konfigurasi.data && !konfigurasi.data.aktif) keterangan = 'Notifikasi belum diaktifkan di server. Hubungi admin.'
  else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') keterangan = 'Izin notifikasi diblokir untuk situs ini. Izinkan lewat pengaturan situs di browser, lalu muat ulang.'
  const bisaDipakai = didukung && !iosBelumDipasang() && !!konfigurasi.data?.aktif && !(typeof Notification !== 'undefined' && Notification.permission === 'denied')

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Notifikasi di perangkat ini</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{keterangan}</p>
        {bisaDipakai && (
          <>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="notif-utama" className="text-sm font-medium">Aktifkan notifikasi</label>
              <Switch id="notif-utama" checked={aktif} disabled={sibuk || status.isLoading} onCheckedChange={(on) => (on ? nyalakan.mutate() : matikan.mutate())} />
            </div>
            {aktif && (
              <div className="space-y-3 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="notif-pesanan" className="text-sm">Pesanan perlu diproses dan permintaan pembatalan</label>
                  <Switch id="notif-pesanan" checked={!!status.data?.pesanan} disabled={sibuk} onCheckedChange={(on) => atur.mutate({ pesanan: on, chat: !!status.data?.chat })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="notif-chat" className="text-sm">Chat pembeli baru</label>
                  <Switch id="notif-chat" checked={!!status.data?.chat} disabled={sibuk} onCheckedChange={(on) => atur.mutate({ pesanan: !!status.data?.pesanan, chat: on })} />
                </div>
                <Button type="button" variant="outline" size="sm" disabled={uji.isPending} onClick={() => uji.mutate()}>
                  Kirim notifikasi uji
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
