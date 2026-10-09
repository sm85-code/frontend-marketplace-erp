import { FilterPilih } from '@/components/daftar'
export default function UkuranHalaman({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <FilterPilih
      id="ukuran-halaman"
      label="Baris per halaman"
      nilai={String(value)}
      onUbah={(v) => onChange(Number(v))}
      opsi={[10, 25, 50].map((n) => ({ value: String(n), label: String(n) }))}
    />
  )
}
