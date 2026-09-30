# frontend-marketplace-erp

Private admin panel for **Marketplace ERP**: a BigSeller/Jubelio-style multi-channel seller panel
for managing many marketplace shops (Shopee, TikTokShop, Lazada, Blibli) from one place. Not the
`toko` storefront — no buyer-facing pages here.

| | |
|---|---|
| **API** | [sm85-code/sm85-arch](https://github.com/sm85-code/sm85-arch), tenant `tenants/marketplace_erp`, prefix **`/api/marketplace-erp`** |
| **Auth** | HttpOnly cookie `marketplace_erp_token` (set by `POST /auth/login`), sent with `withCredentials` |
| **Stack** | Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/radix · lucide-react · TanStack Query · React Router 7 · recharts · sonner · oxlint · Vitest · yarn |
| **Conventions** | Same design system as `frontend-siabumdes-ts` / `frontend-madrasah` (index.css tokens, shadcn UI kit, Appearance popover with light/dark mode) |

## Screens

| Route | Screen | Backend endpoints |
|---|---|---|
| `/login` | Login | `POST /auth/login`, `GET /auth/me` |
| `/ganti-password` | Change password (forced on default-password accounts) | `POST /auth/change-password` |
| `/dashboard` | Omzet, pesanan per status, produk terlaris, stok kritis (owner) | `GET /laporan/ringkas`, `GET /akun` |
| `/toko` | Shop accounts: CRUD, Shopee OAuth connect, pull orders | `GET/POST/PATCH/DELETE /akun`, `GET /oauth/shopee/start`, `POST /akun/{id}/sync/pesanan` |
| `/oauth/shopee/callback/:akunId` | Shopee OAuth return (public) | `GET /oauth/shopee/callback/{akun_id}` |
| `/produk` | Parent SKUs: CRUD, activate/deactivate | `GET/POST/PATCH/DELETE /produk` |
| `/listing` | Map a SKU to a shop listing, price/stock override | `GET/POST/PATCH/DELETE /listing` |
| `/gudang` | Warehouses, current stock, ledger, adjust, transfer | `GET/POST /gudang`, `GET /stok/ledger`, `POST /stok/adjust`, `POST /stok/transfer` |
| `/pesanan` | Order inbox: status tabs, manual order entry | `GET/POST /pesanan` |
| `/pesanan/:id` | Order detail: pipeline actions, pengiriman (kurir/resi), cancel/delete | `GET/DELETE /pesanan/{id}`, `POST /pesanan/{id}/status`, `POST /pesanan/{id}/pengiriman` |
| `/settlement` | Manual payout reconciliation per shop/period | `GET/POST/PATCH /settlement` |
| `/iklan` | Ad campaigns list/create | `GET/POST /iklan` |
| `/iklan/:id` | Campaign lifecycle, daily spend entry, ROAS report + chart | `PATCH /iklan/{id}`, `GET/POST /iklan/{id}/metrik`, `GET /iklan/{id}/laporan` |
| `/staff` | Staff accounts + per-shop assignment | `GET/POST /users`, `GET/POST/DELETE /staff-akun` |
| `/profile` | Own profile + link to change password | — |

`staff`-role accounts see only Dashboard, Toko, Pesanan and Profile, scoped server-side to the
shops assigned via `/staff-akun` (see backend `akun_ids_diizinkan`/`pastikan_akses_akun`).

Desktop has a fixed sidebar. On mobile you get a top bar with a drawer, and a bottom tab bar.

`src/api/types.ts` mirrors `schemas.py` field for field, `src/api/endpoints.ts` has one function
per backend route. Do **not** add endpoints the backend doesn't expose — `src/lib/pesanan.ts`
mirrors the backend transition table `services._TRANSISI_STATUS`; keep them in sync.

## Local development

```bash
cp .env.example .env        # VITE_BACKEND_URL
yarn install
yarn dev                    # http://localhost:3000
yarn lint && yarn test && yarn build
```

Recommended local setup: leave `VITE_BACKEND_URL` empty so the FE calls
`window.location.origin/api/...`. Vite proxies `/api` to `DEV_PROXY_TARGET` (default
`http://localhost:8000`), which keeps the cookie same-origin. Run the backend with
`COOKIE_SECURE=false COOKIE_SAMESITE=lax` and `CORS_ORIGINS=http://localhost:3000`.

To log in the first time, seed the backend (`GET /api/marketplace-erp/seed-now`, gated by
`MARKETPLACE_ERP_SEED_SECRET` in production). Default account: `owner@marketplace-erp.internal` /
`password123` — change it immediately via Ganti Password in any real environment.

## Environment variables

| Var | When | Value |
|---|---|---|
| `VITE_BACKEND_URL` | **build time** | Origin of sm85-arch **without** `/api`, e.g. `https://api.example.com`. A trailing `/api` is stripped automatically. |

## Deploy: DigitalOcean App Platform (static site)

1. **Create → App → GitHub** `sm85-code/frontend-marketplace-erp`, branch `main`, component type **Static Site**.
2. Build command: `yarn install --frozen-lockfile && yarn build`
3. Output directory: `dist`
4. **Catchall document: `index.html`** — required for SPA routes like `/pesanan/123` and the
   Shopee OAuth callback to survive a refresh/redirect.
5. Env: `VITE_BACKEND_URL=https://<BE_ORIGIN>`, scope **Build time**.
6. `package.json` sets `engines.node = 22.x`; `.yarnrc` has `ignore-engines true`.

## Required backend env (sm85-arch)

Add this FE's deployed origin to `CORS_ORIGINS`, and set `SHOPEE_REDIRECT_URI` to
`https://<FE_ORIGIN>/oauth/shopee/callback` once the FE is deployed.
