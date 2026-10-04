import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { daftarAksiIklanShopee, listAkun, panggilIklanShopee } from "@/api/endpoints"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Baris = Record<string, string | number>

function ambilDaftar(data: unknown): Baris[] {
  if (!data || typeof data !== "object") return []
  const akar = data as Record<string, unknown>
  const respon = (akar.response && typeof akar.response === "object" ? akar.response : akar) as Record<string, unknown>
  const calon = respon.campaign_list ?? respon.item_list ?? respon.keyword_list ?? respon.suggested_keyword_list
  if (!Array.isArray(calon)) return []
  return calon.slice(0, 30).map((item) => {
    const baris = item as Record<string, unknown>
    const rata: Baris = {}
    for (const [k, v] of Object.entries(baris)) {
      if (typeof v === "string" || typeof v === "number") rata[k] = v
    }
    return rata
  })
}

export default function IklanShopeePage() {
  const toko = useQuery({ queryKey: ["akun", "shopee"], queryFn: () => listAkun("shopee") })
  const aksi = useQuery({ queryKey: ["iklan-aksi"], queryFn: daftarAksiIklanShopee })
  const [akunId, setAkunId] = useState("")
  const [itemId, setItemId] = useState("")
  const [budget, setBudget] = useState("50000")
  const [mulai, setMulai] = useState("")
  const [kampanye, setKampanye] = useState("")
  const [kata, setKata] = useState("")
  const [judul, setJudul] = useState("")
  const [baris, setBaris] = useState<Baris[]>([])
  const [pesan, setPesan] = useState("")
  const [mentah, setMentah] = useState("")
  const [sibuk, setSibuk] = useState(false)

  async function jalan(nama: string, judulBaru: string, payload: { params?: object; body?: object } = {}) {
    if (!akunId) return
    setSibuk(true)
    setJudul(judulBaru)
    try {
      const data = await panggilIklanShopee(akunId, nama, payload)
      const daftar = ambilDaftar(data)
      setBaris(daftar)
      setPesan(daftar.length ? `${daftar.length} baris` : "Shopee membalas, tanpa daftar untuk ditampilkan.")
      setMentah(JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setBaris([])
      setPesan(e instanceof Error ? e.message : "Gagal memanggil Shopee")
      setMentah("")
    } finally {
      setSibuk(false)
    }
  }

  const tanggal = mulai ? mulai.split("-").reverse().join("-") : ""
  const kolom = Object.keys(baris[0] ?? {}).slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kelola iklan di Shopee</CardTitle>
        <p className="text-sm text-muted-foreground">Ini yang benar-benar mengubah iklan di Shopee. Catatan di bawah hanya pengingat lokal.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md space-y-2">
          <Label>Toko</Label>
          <Select value={akunId} onValueChange={setAkunId}>
            <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
            <SelectContent>
              {(toko.data ?? []).filter((a) => a.platform === "shopee").map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.nama_toko}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!akunId || sibuk} onClick={() => jalan("saldo", "Saldo iklan")}>Saldo iklan</Button>
          <Button disabled={!akunId || sibuk} variant="outline" onClick={() => jalan("daftar_kampanye", "Kampanye")}>Daftar kampanye</Button>
          <Button disabled={!akunId || sibuk} variant="outline" onClick={() => jalan("cek_gmv", "GMV Max")}>Cek GMV Max</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Item ID Shopee</Label><Input value={itemId} onChange={(e) => setItemId(e.target.value)} /></div>
          <div><Label>Anggaran</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
          <div><Label>Mulai</Label><Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} /></div>
          <div><Label>Kata kunci</Label><Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="opsional, untuk riset" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!akunId || !itemId || sibuk} variant="outline" onClick={() => jalan("saran_kata_kunci", "Saran kata kunci", { params: { item_id: Number(itemId), keyword: kata } })}>Riset kata kunci</Button>
          <Button disabled={!akunId || !itemId || sibuk} variant="outline" onClick={() => jalan("saran_roas", "Saran ROAS", { params: { item_id: Number(itemId) } })}>Saran ROAS</Button>
          <Button disabled={!akunId || !itemId || !tanggal || sibuk} onClick={() => jalan("buat_manual", "Iklan dibuat", { body: { reference_id: crypto.randomUUID(), item_id: Number(itemId), budget: Number(budget), start_date: tanggal, end_date: "", bidding_method: "auto" } })}>Buat iklan di Shopee</Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div><Label>ID kampanye</Label><Input value={kampanye} onChange={(e) => setKampanye(e.target.value)} /></div>
          <Button disabled={!akunId || !kampanye || sibuk} variant="outline" onClick={() => jalan("ubah_manual", "Kampanye dijeda", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(kampanye), edit_action: "pause" } })}>Jeda</Button>
          <Button disabled={!akunId || !kampanye || sibuk} variant="outline" onClick={() => jalan("ubah_manual", "Kampanye dilanjutkan", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(kampanye), edit_action: "resume" } })}>Lanjutkan</Button>
        </div>
        {judul && <p className="text-sm">{judul}: {pesan}</p>}
        {baris.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{kolom.map((k) => <th key={k} className="px-2 py-1 text-left font-medium">{k.replaceAll("_", " ")}</th>)}</tr></thead>
              <tbody>
                {baris.map((r, i) => <tr key={i} className="border-t">{kolom.map((k) => <td key={k} className="px-2 py-1 whitespace-nowrap">{r[k] ?? ""}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )}
        {mentah && (
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">Jawaban mentah</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">{mentah}</pre>
          </details>
        )}
        <p className="text-sm text-muted-foreground">Aksi tersambung: {(aksi.data ?? []).length}</p>
      </CardContent>
    </Card>
  )
}
