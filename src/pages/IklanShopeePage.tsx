import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { listAkun, panggilIklanShopee } from "@/api/endpoints"
import { getApiError } from "@/api/client"
import { TabelLokal, type KolomTabel } from "@/components/daftar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Baris = { id: string; nama: string; status: string; anggaran: string }

function teks(v: unknown) {
  return typeof v === "string" || typeof v === "number" ? String(v) : ""
}

function jadiBaris(data: unknown): Baris[] {
  if (!data || typeof data !== "object") return []
  const akar = data as Record<string, unknown>
  const respon = (akar.response && typeof akar.response === "object" ? akar.response : akar) as Record<string, unknown>
  const calon = respon.campaign_list ?? respon.item_list ?? respon.keyword_list ?? respon.suggested_keyword_list
  if (!Array.isArray(calon)) return []
  return calon.slice(0, 50).map((item, i) => {
    const r = item as Record<string, unknown>
    return {
      id: teks(r.campaign_id ?? r.item_id ?? r.keyword ?? i + 1),
      nama: teks(r.ad_name ?? r.item_name ?? r.keyword ?? r.campaign_id ?? "—"),
      status: teks(r.campaign_status ?? r.status ?? r.match_type ?? "—"),
      anggaran: teks(r.budget ?? r.bid_price_per_click ?? r.suggested_bid ?? "—"),
    }
  })
}

const kolom: KolomTabel<Baris>[] = [
  { kunci: "nama", judul: "Nama", kelas: "font-medium", sel: (r) => r.nama, nilai: (r) => r.nama },
  { kunci: "status", judul: "Status", kelas: "whitespace-nowrap", sel: (r) => r.status, nilai: (r) => r.status },
  { kunci: "anggaran", judul: "Anggaran / bid", rata: "kanan", kelas: "whitespace-nowrap", sel: (r) => r.anggaran, nilai: (r) => r.anggaran },
  { kunci: "id", judul: "ID", kelas: "whitespace-nowrap", sel: (r) => r.id, nilai: (r) => r.id },
]

export default function IklanShopeePage() {
  const toko = useQuery({ queryKey: ["akun", "shopee"], queryFn: () => listAkun("shopee") })
  const [akunId, setAkunId] = useState("")
  const [itemId, setItemId] = useState("")
  const [budget, setBudget] = useState("50000")
  const [mulai, setMulai] = useState("")
  const [kata, setKata] = useState("")
  const [baris, setBaris] = useState<Baris[]>([])
  const [judul, setJudul] = useState("")
  const [sibuk, setSibuk] = useState(false)

  async function jalan(nama: string, judulBaru: string, payload: { params?: object; body?: object } = {}) {
    if (!akunId) {
      toast.error("Pilih toko dulu")
      return
    }
    setSibuk(true)
    setJudul(judulBaru)
    try {
      const data = await panggilIklanShopee(akunId, nama, payload)
      const daftar = jadiBaris(data)
      setBaris(daftar)
      toast.success(daftar.length ? `${judulBaru}: ${daftar.length} baris` : `${judulBaru} terkirim`)
    } catch (e) {
      setBaris([])
      toast.error(getApiError(e))
    } finally {
      setSibuk(false)
    }
  }

  const tanggal = mulai ? mulai.split("-").reverse().join("-") : ""
  const tokoShopee = (toko.data ?? []).filter((a) => a.platform === "shopee")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kelola iklan di Shopee</CardTitle>
        <p className="text-sm text-muted-foreground">Tombol di sini mengubah iklan di Shopee. Catatan di bawah hanya pengingat, tidak terkirim.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md space-y-2">
          <Label>Toko</Label>
          <Select value={akunId} onValueChange={setAkunId}>
            <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
            <SelectContent>
              {tokoShopee.map((a) => <SelectItem key={a.id} value={a.id}>{a.nama_toko}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={sibuk} onClick={() => jalan("saldo", "Saldo iklan")}>Saldo iklan</Button>
          <Button disabled={sibuk} variant="outline" onClick={() => jalan("daftar_kampanye", "Kampanye", { params: { ad_type: "all", offset: 0, limit: 50 } })}>Daftar kampanye</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Item ID Shopee</Label><Input value={itemId} onChange={(e) => setItemId(e.target.value)} /></div>
          <div><Label>Anggaran</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
          <div><Label>Mulai</Label><Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} /></div>
          <div><Label>Kata kunci</Label><Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="opsional" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={sibuk || !itemId} variant="outline" onClick={() => jalan("saran_kata_kunci", "Saran kata kunci", { params: { item_id: Number(itemId), keyword: kata } })}>Riset kata kunci</Button>
          <Button disabled={sibuk || !itemId || !tanggal} onClick={() => jalan("buat_manual", "Iklan dibuat", { body: { reference_id: crypto.randomUUID(), item_id: Number(itemId), budget: Number(budget), start_date: tanggal, end_date: "", bidding_method: "auto" } })}>Buat iklan di Shopee</Button>
        </div>
        {judul && <p className="text-sm font-medium">{judul}</p>}
        <TabelLokal label="Hasil iklan Shopee" items={baris} kolom={kolom} idDari={(r) => r.id} namaDari={(r) => r.nama} minWidth={640} aksi={(r) => (
          <span className="flex gap-1">
            <Button size="sm" variant="outline" disabled={sibuk} onClick={() => jalan("ubah_manual", "Dijeda", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(r.id), edit_action: "pause" } })}>Jeda</Button>
            <Button size="sm" variant="outline" disabled={sibuk} onClick={() => jalan("ubah_manual", "Dilanjutkan", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(r.id), edit_action: "resume" } })}>Lanjut</Button>
          </span>
        )} />
        {baris.length === 0 && <p className="text-center text-sm text-muted-foreground">Belum ada daftar. Pilih toko, lalu tekan Daftar kampanye.</p>}
      </CardContent>
    </Card>
  )
}
