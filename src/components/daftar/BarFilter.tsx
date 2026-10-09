import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRESET_LABEL, type PresetTanggal } from '@/lib/rentang'
import Medan from './Medan'

/**
 * Filters of a list page. Put the controls below inside; the grid, the equal control height and the phone
 * layout come from the global `.bar-filter` styles, so a page only declares WHICH filters it has.
 */
export function BarFilter({ utama, aktif = 0, children }: { utama?: ReactNode; aktif?: number; children: ReactNode }) {
  const [buka, setBuka] = useState(false)
  const panelId = useId()
  return (
    <div className="bar-filter">
      {utama}
      {/* Phones: the search stays visible and the other filters fold behind one button (data comes first).
          md and up: everything is shown in the same grid (display: contents). */}
      <div className="md:hidden" style={{ gridColumn: '1 / -1' }}>
        <Button variant="outline" onClick={() => setBuka((b) => !b)} aria-expanded={buka} aria-controls={panelId}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filter &amp; urutan{aktif > 0 ? ` (${aktif} aktif)` : ''}
          <ChevronDown className={`ml-auto size-4 transition-transform ${buka ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>
      </div>
      <div id={panelId} className={buka ? 'contents' : 'hidden md:contents'}>
        {children}
      </div>
    </div>
  )
}

/** Search box: types freely, tells the page only after a short pause. `nilai` follows resets from outside. */
export function FilterCari({
  id,
  label = 'Cari',
  placeholder,
  nilai,
  onUbah,
}: {
  id: string
  label?: string
  placeholder: string
  nilai: string
  onUbah: (v: string) => void
}) {
  const [teks, setTeks] = useState(nilai)
  const terakhir = useRef(nilai)

  useEffect(() => {
    if (nilai !== terakhir.current) {
      terakhir.current = nilai
      setTeks(nilai) // reset from outside
    }
  }, [nilai])

  useEffect(() => {
    const t = setTimeout(() => {
      const bersih = teks.trim()
      if (bersih !== terakhir.current) {
        terakhir.current = bersih
        onUbah(bersih)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [teks, onUbah])

  return (
    <Medan label={label} untuk={id} className="span-2">
      <Input id={id} placeholder={placeholder} value={teks} onChange={(e) => setTeks(e.target.value)} />
    </Medan>
  )
}

export interface OpsiFilter {
  value: string
  label: string
}

const SEMUA = '__semua__' // a Select item cannot have an empty value, so "all" travels as this and is mapped back to ''

/** Dropdown filter. `semua` is the label of the "no filter" choice (value ''), e.g. "Semua toko (160)". */
export function FilterPilih({
  id,
  label,
  nilai,
  onUbah,
  opsi,
  semua,
}: {
  id: string
  label: string
  nilai: string
  onUbah: (v: string) => void
  opsi: OpsiFilter[]
  semua?: string
}) {
  return (
    <Medan label={label} untuk={id}>
      <Select value={nilai === '' && semua ? SEMUA : nilai} onValueChange={(v) => onUbah(v === SEMUA ? '' : v)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {semua && <SelectItem value={SEMUA}>{semua}</SelectItem>}
          {opsi.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Medan>
  )
}

export interface NilaiTanggal {
  tanggal: PresetTanggal
  dari: string
  sampai: string
}

/** Date preset dropdown; choosing "Pilih tanggal…" adds two date inputs in the same grid. */
export function FilterTanggal({
  id,
  label = 'Tanggal pesan',
  presets,
  nilai,
  onUbah,
}: {
  id: string
  label?: string
  presets?: PresetTanggal[]
  nilai: NilaiTanggal
  onUbah: (patch: Partial<NilaiTanggal>) => void
}) {
  const daftar = presets ?? (Object.keys(PRESET_LABEL) as PresetTanggal[])
  return (
    <>
      <FilterPilih
        id={id}
        label={label}
        nilai={nilai.tanggal}
        onUbah={(v) => onUbah({ tanggal: v as PresetTanggal })}
        opsi={daftar.map((k) => ({ value: k, label: PRESET_LABEL[k] }))}
      />
      {nilai.tanggal === 'kustom' && (
        <>
          <Medan label="Dari" untuk={`${id}-dari`}>
            <Input id={`${id}-dari`} type="date" value={nilai.dari} onChange={(e) => onUbah({ dari: e.target.value })} />
          </Medan>
          <Medan label="Sampai" untuk={`${id}-sampai`}>
            <Input id={`${id}-sampai`} type="date" value={nilai.sampai} onChange={(e) => onUbah({ sampai: e.target.value })} />
          </Medan>
        </>
      )}
    </>
  )
}

/** A yes/no filter, lined up with the inputs next to it. */
export function FilterSakelar({ id, label, nilai, onUbah }: { id: string; label: string; nilai: boolean; onUbah: (v: boolean) => void }) {
  return (
    <Medan>
      <label htmlFor={id} className="kontrol cursor-pointer text-sm">
        <Checkbox id={id} checked={nilai} onCheckedChange={(v) => onUbah(v === true)} />
        {label}
      </label>
    </Medan>
  )
}

/** A cell for buttons (reset, select page...) that must line up with the labelled inputs. */
export function FilterAksi({ children }: { children: ReactNode }) {
  return <Medan>{children}</Medan>
}
