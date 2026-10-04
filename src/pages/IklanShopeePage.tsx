import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { daftarAksiIklanShopee, listAkun, panggilIklanShopee } from "@/api/endpoints"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function IklanShopeePage() {
  const toko = useQuery({ queryKey: ["akun", "shopee"], queryFn: () => listAkun("shopee") })
  const aksi = useQuery({ queryKey: ["iklan-aksi"], queryFn: daftarAksiIklanShopee })
  const [akunId, setAkunId] = useState("")
  const [itemId, setItemId] = useState("")
  const [budget, setBudget] = useState("50000")
  const [mulai, setMulai] = useState("")
  const [kampanye, setKampanye] = useState("")
  const [kata, setKata] = useState("")
  const [hasil, setHasil] = useState("")
  const [sibuk, setSibuk] = useState(false)

  async function jalan(nama: string, payload: { params?: object; body?: object } = {}) {
    if (!akunId) return
    setSibuk(true)
    try {
      const data = await panggilIklanShopee(akunId, nama, payload)
      setHasil(JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setHasil(e instanceof Error ? e.message : "Gagal memanggil Shopee")
    } finally {
      setSibuk(false)
    }
  }

  const tanggal = mulai ? mulai.split("-").reverse().join("-") : ""

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Iklan Shopee</h1>
      <p className="text-sm text-muted-foreground">Seluruh API iklan yang terdokumentasi. Iklan otomatis dan GMV Max hanya jalan jika toko di-whitelist Shopee.</p>
      <div className="max-w-md space-y-2">
        <Label>Toko</Label>
        <Select value={akunId} onValueChange={setAkunId}>
          <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
          <SelectContent>
            {(toko.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.nama_toko}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!akunId || sibuk} onClick={() => jalan("saldo")}>Saldo iklan</Button>
        <Button disabled={!akunId || sibuk} variant="outline" onClick={() => jalan("daftar_kampanye")}>Daftar kampanye</Button>
        <Button disabled={!akunId || sibuk} variant="outline" onClick={() => jalan("cek_gmv")}>Cek GMV Max</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Item ID Shopee</Label><Input value={itemId} onChange={(e) => setItemId(e.target.value)} /></div>
        <div><Label>Anggaran</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
        <div><Label>Mulai</Label><Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} /></div>
        <div><Label>Kata kunci</Label><Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="untuk riset" /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!akunId || !itemId || sibuk} variant="outline" onClick={() => jalan("saran_kata_kunci", { params: { item_id: Number(itemId), keyword: kata } })}>Riset kata kunci</Button>
        <Button disabled={!akunId || !itemId || sibuk} variant="outline" onClick={() => jalan("saran_roas", { params: { item_id: Number(itemId) } })}>Saran ROAS</Button>
        <Button disabled={!akunId || !itemId || !tanggal || sibuk} onClick={() => jalan("buat_manual", { body: { reference_id: crypto.randomUUID(), item_id: Number(itemId), budget: Number(budget), start_date: tanggal, end_date: "", bidding_method: "auto" } })}>Buat iklan bidding otomatis</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div><Label>Campaign ID</Label><Input value={kampanye} onChange={(e) => setKampanye(e.target.value)} /></div>
        <Button disabled={!akunId || !kampanye || sibuk} variant="outline" onClick={() => jalan("ubah_manual", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(kampanye), edit_action: "pause" } })}>Jeda</Button>
        <Button disabled={!akunId || !kampanye || sibuk} variant="outline" onClick={() => jalan("ubah_manual", { body: { reference_id: crypto.randomUUID(), campaign_id: Number(kampanye), edit_action: "resume" } })}>Lanjutkan</Button>
      </div>
      <p className="text-sm text-muted-foreground">Aksi lain: {(aksi.data ?? []).map((a) => a.aksi).join(", ") || "memuat..."}</p>
      {hasil && <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">{hasil}</pre>}
    </div>
  )
}
