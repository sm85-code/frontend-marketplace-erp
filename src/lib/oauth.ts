/** FE route Shopee redirects the browser back to (see App.tsx). */
export const SHOPEE_CALLBACK_ROUTE = '/oauth/shopee/callback'

/**
 * redirect_uri passed to GET /oauth/shopee/start. The BE forwards it to Shopee;
 * Shopee appends `?code=...&shop_id=...` and the FE callback page then asks the BE
 * to exchange the code (GET /oauth/shopee/callback/{akun_id}).
 */
export function buildShopeeRedirectUri(origin: string, akunId: string): string {
  return `${origin.replace(/\/+$/, '')}${SHOPEE_CALLBACK_ROUTE}/${encodeURIComponent(akunId)}`
}

export interface ShopeeCallbackParams {
  code: string
  shop_id: string
}

/** Shopee sends `shop_id` for shop auth; `main_account_id` (merchant auth) is not supported by the BE. */
export function parseShopeeCallback(search: string): ShopeeCallbackParams | { error: string } {
  const q = new URLSearchParams(search)
  const code = (q.get('code') || '').trim()
  const shopId = (q.get('shop_id') || '').trim()
  if (!code) return { error: 'Parameter "code" dari Shopee tidak ditemukan.' }
  if (!shopId) {
    if (q.get('main_account_id')) {
      return {
        error:
          'Shopee mengirim main_account_id (otorisasi merchant). Backend saat ini hanya mendukung otorisasi per toko (shop_id).',
      }
    }
    return { error: 'Parameter "shop_id" dari Shopee tidak ditemukan.' }
  }
  return { code, shop_id: shopId }
}
