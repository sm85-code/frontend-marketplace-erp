import type { ListingMarketplaceDetail, ProdukListing } from '@/api/types'

/** Keep shop mappings separate; use a parent title only when every available mapping agrees. */
export function pemetaanProduk(listings: ProdukListing[]) {
  const perProduk = new Map<string, ListingMarketplaceDetail[]>()
  for (const listing of listings) {
    if (!listing.detail_marketplace) continue
    const details = perProduk.get(listing.produk_id) ?? []
    details.push(listing.detail_marketplace)
    perProduk.set(listing.produk_id, details)
  }
  return new Map([...perProduk].map(([id, details]) => {
    const names = [...new Set(details.map((d) => d.nama_produk))]
    const signatures = [...new Set(details.map((d) => JSON.stringify(d.opsi)))]
    return [id, {
      nama: names.length === 1 ? names[0] : null,
      opsi: signatures.length === 1 ? details[0].opsi : null,
      berbeda: names.length > 1 || signatures.length > 1,
    }] as const
  }))
}
