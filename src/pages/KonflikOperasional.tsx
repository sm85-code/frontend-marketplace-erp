import { useState } from 'react'

type Konflik = { key: string; label: string; manual: string; otomatis: number }

export default function KonflikOperasional({ konflik, onOtomatis }: { konflik: Konflik[]; onOtomatis?: (key: string) => void }) {
  const [dipertahankan, setDipertahankan] = useState<string[]>([])
  if (!konflik.length) return null
  const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  return <div role="alert" className="rounded border border-amber-500 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
    <p className="font-semibold">Perbedaan nilai manual dan Operasional</p>
    <p>Total memakai nilai manual. Periksa sebelum mengambil keputusan; data tidak diubah otomatis.</p>
    {konflik.map((k) => {
      const id = `${k.key}|${k.manual}|${k.otomatis}`
      const tanggal = k.key.slice(k.key.lastIndexOf('|') + 1)
      return <div key={id} className="space-y-2 border-t border-amber-300 pt-2">
        <p><strong>{k.label}</strong> ({tanggal}): manual {rupiah(Number(k.manual))}; Operasional {rupiah(k.otomatis)}.</p>
        {dipertahankan.includes(id) ? <p>Nilai manual dipertahankan untuk tampilan ini; perbedaan akan muncul lagi saat halaman dimuat ulang.</p> : onOtomatis && <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border border-amber-800 px-3 py-2" onClick={() => onOtomatis(k.key)}>Gunakan nilai otomatis</button>
          <button type="button" className="rounded border border-amber-800 px-3 py-2" onClick={() => setDipertahankan((v) => [...v, id])}>Pertahankan nilai manual</button>
        </div>}
      </div>
    })}
  </div>
}
