# Standar UI/UX — ERP Ampel Kuning

Aturan ini berlaku untuk **semua halaman**. Prinsipnya: aturan hidup di satu tempat (token CSS + kit komponen),
halaman hanya mendeklarasikan isinya. Kalau ada revisi gaya, ubah di sana, bukan di tiap halaman.

## 1. Prinsip dari pemilik produk

1. **Proporsional dulu.** Yang dinilai adalah *feel*: tampilan seimbang, tidak sesak, tidak kebesaran.
2. **Satu tabel terlihat nyaris seluruhnya** supaya efektif: baris rapat, teks produk maksimal 2 baris.
   Kalau tabel lebih lebar dari layar, **boleh digeser samping**; kolom identitas dan kolom *Aksi* menempel.
3. **Ukuran huruf**: cukup sediakan opsi Kecil / Sedang / Besar (menu *Tampilan*). Bawaan sengaja padat.
4. **Aksi utama ada di baris** (mis. *Cetak resi*, *Detail*); aksi massal di bilah bawah saat baris dicentang.
5. **Filter berbentuk dropdown berlabel**, sejajar, tidak memenuhi layar. Di HP filter terlipat.
6. **Semua tabel bisa disortir** (klik judul kolom; di HP juga lewat dropdown *Urutan*).
7. **Tabel tetap tabel di HP** (bukan kartu); geser samping, kolom identitas dan Aksi menempel.
8. **Menu mengikuti alur kerja** dan sama di desktop dan HP.

## 2. Skala huruf dan kepadatan (token)

Didefinisikan di `src/theme-extras.css`; dipakai lewat `.teks-data`, `.teks-kecil`, `.teks-judul`
dan otomatis oleh `ui/table.tsx`. Jangan menulis `text-sm`/`text-xs` untuk data tabel.

| Token | Desktop | HP (< 768px) | Dipakai untuk |
|---|---|---|---|
| `--teks-data` | 13px | 12px | isi sel tabel, nilai di kartu |
| `--teks-kecil` | 12px | 11px | baris kedua, keterangan |
| `--teks-judul` | 11px | 10px | judul kolom |
| `--pad-sel-x/y` | 0.625 / 0.4rem | 0.5 / 0.3rem | bantalan sel |

`html[data-huruf]` (`kecil` 0.92×, `sedang` 1×, `besar` 1.14×) mengalikan semuanya. Judul halaman 20px (HP) / 24px.
Kontrol (input, dropdown, tombol di bar filter) tingginya **44px** (target sentuh), huruf mengikuti `--teks-data`.

> **Trade-off yang disadari:** panduan umum menyarankan teks isi ≥16px di HP. Aplikasi ini aplikasi data;
> pemilik produk meminta lebih banyak data terlihat sekaligus. Mitigasi: opsi *Besar*, kontras ≥4.5:1,
> area sentuh 44px, dan semua ukuran berbasis rem (ikut pengaturan huruf browser).

## 3. Kit komponen daftar (`src/components/daftar`)

| Komponen | Fungsi |
|---|---|
| `BarHalaman` | judul + aksi halaman, turun baris di HP |
| `BarFilter` + `FilterCari/Pilih/Tanggal/Sakelar/Aksi` | filter berlabel dalam satu grid; di HP hanya pencarian terlihat, sisanya di tombol *Filter & urutan (n aktif)* |
| `TabelData` | tabel di semua lebar layar (di HP digeser samping), dari **satu** deklarasi kolom. **Tidak ada tampilan kartu.** |
| `TabelLokal` | `TabelData` + sortir di browser, untuk data yang dimuat penuh |
| `KepalaUrut` | judul kolom yang bisa diklik (`aria-sort`) |
| `PemilihKolom` | pilih kolom yang tampil (diingat di browser) |
| `Paginasi` | nomor halaman, target 44px |
| `BarPilihan` | bilah bawah untuk aksi massal |
| `PilihTampilan` | sakelar Grid/List |
| `Medan` | label terlihat + kontrol, terhubung `htmlFor` |

Hook pendukung di `src/lib`: `useFilterDaftar` (filter + halaman, filter berubah = kembali ke halaman 1),
`useTerpilih`, `useKolomTersimpan`, `useUrutLokal`, `rentang` (preset tanggal), `urut`, `simpan`.

### Halaman daftar baru, secukupnya

```tsx
const KOLOM: KolomTabel<Item>[] = [
  { kunci: 'nama', judul: 'Nama', tetap: true, sel: (i) => i.nama, nilai: (i) => i.nama },
  { kunci: 'total', judul: 'Total', rata: 'kanan', sel: (i) => fmtRp(i.total), nilai: (i) => Number(i.total) },
]
<BarHalaman judul="Judul"><Button>Tambah</Button></BarHalaman>
<TabelLokal label="Daftar ..." items={data} kolom={KOLOM} idDari={(i) => i.id} namaDari={(i) => i.nama}
  aksi={(i) => <Button>Detail</Button>} />
```

Daftar berhalaman dari server (Pesanan, Katalog): `TabelData` + `useFilterDaftar` + `Paginasi`; `urut` dikirim
sebagai `kolom:asc|desc` dan kuncinya harus dikenal API (`urut.kunci` pada kolom).

## 4. Menu

`src/config/nav.ts`: **urutan array `NAV` adalah urutan menu** (sidebar, drawer, bilah bawah).
Grup: Harian (Dashboard, Pesanan) → Produk (Katalog Shopee, Produk, Listing, Gudang & Stok) →
Keuangan & Iklan (Settlement, Iklan) → Pengaturan (Toko, Staff, Profil Saya).
Bilah bawah HP: 4 menu `bawah` berprioritas tertinggi yang boleh dilihat peran itu, ditampilkan menurut urutan alur;
sisanya lewat *Lainnya* (drawer yang sama). Pemilik: Dashboard, Pesanan, Katalog, Produk. Staf: Dashboard, Pesanan, Toko, Profil.

## 5. Aksesibilitas (wajib)

- Setiap kontrol punya **label terlihat** yang terhubung (`Medan`, atau `<Label htmlFor>` + `id`); placeholder bukan label.
- Tombol ikon dan popover punya nama (`aria-label`); ikon dekoratif `aria-hidden`.
- Kontras teks ≥ **4.5:1** di mode terang dan gelap (lencana dan tombol *destructive* sudah disetel).
- Target sentuh ≥ 44px, jarak antar target ≥ 8px; fokus terlihat (`focus-visible`).
- Status tidak hanya dengan warna (selalu ada teks). Lencana memakai `whitespace-nowrap`.
- Tabel punya `<caption class="sr-only">` dan wilayah geser bernama + bisa difokus (`TableShell label`).
- Satu `h1` per halaman.

## 6. Jebakan yang pernah terjadi

- Teks `sr-only` (absolute) di dalam wilayah geser **melebarkan seluruh halaman** kecuali induknya `relative`
  → `TableShell` sudah `relative`; jangan dihapus.
- Grid satu kolom melebar mengikuti isi (tabel): pakai `grid-cols-[minmax(0,1fr)]`.
- `SelectItem` tidak boleh bernilai kosong: filter memakai nilai pengganti (lihat `FilterPilih`).
- `position: sticky` butuh latar solid (`bg-card`) supaya sel yang digeser tidak tembus.

## 7. Cek sebelum merge

1. `npx tsc -b`, `npx oxlint`, `npx vitest run`.
2. axe-core (WCAG 2 A/AA) bersih di semua halaman, mode terang dan gelap, **tanpa geser samping halaman** di lebar
   320, 375, 414, 768, 1024, 1440 px.
3. Lihat tampilan nyata di desktop dan HP; sidebar tidak terpotong di tinggi 800px.
4. Halaman baru: tambahkan ke kit (jangan membuat tabel/filter sendiri).

*Rujukan: panduan UX dari repo `nextlevelbuilder/ui-ux-pro-max-skill` (dibaca sebagai referensi, tidak dipasang).*
