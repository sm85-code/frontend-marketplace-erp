# frontend-marketplace-erp

Private admin panel (thin FE) for **Marketplace ERP**: a BigSeller/Jubelio-style multi-channel seller panel for our own business (~32 Shopee shops). This is **not** the deferred `toko` storefront and has no buyer-facing pages.

| | |
|---|---|
| **API** | [sm85-code/sm85-arch](https://github.com/sm85-code/sm85-arch), tenant `tenants/marketplace_erp`, prefix **`/api/marketplace-erp`** (Tahap 2, after PR #162) |
| **Auth** | HttpOnly cookie `marketplace_erp_token` (set by `POST /auth/login`), sent with `withCredentials` (same as fetch `credentials: 'include'`) |
| **Stack** | Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/radix · lucide-react · TanStack Query · React Router 7 · react-hook-form + zod · axios · oxlint · Vitest · yarn (v1) |
| **Conventions** | Same as [frontend-siabumdes-ts](https://github.com/sm85-code/frontend-siabumdes-ts) |

## Screens (T2)

| Route | Screen | Backend endpoints |
|---|---|---|
| `/login` | Login (+ logout in the sidebar, session via `me`) | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| `/toko` | Store / marketplace accounts: list + platform filter, create, edit (name, shop id, **status**, notes, optional manual token), delete, **Hubungkan Shopee**, pull orders | `GET/POST /akun`, `PATCH/DELETE /akun/{id}`, `GET /oauth/shopee/start`, `POST /akun/{id}/sync/pesanan` |
| `/oauth/shopee/callback/:akunId` | Shopee OAuth return: sends `code` + `shop_id` to the BE, which exchanges them for tokens | `GET /oauth/shopee/callback/{akun_id}` (public) |
| `/produk` | Parent SKUs (SKU induk): list/search, create (with opening stock), edit, activate/deactivate, delete | `GET/POST /produk`, `PATCH/DELETE /produk/{id}` |
| `/listing` | Map a SKU to a shop listing (`id_eksternal`), optional price/stock override, activate/deactivate | `GET/POST /listing`, `PATCH/DELETE /listing/{id}` |
| `/stok` | Current (available) stock, adjustment form (stock in/out, warehouse, notes), ledger with product filter and row limit | `GET /produk`, `GET /gudang`, `POST /stok/adjust`, `GET /stok/ledger` |
| `/pesanan` | Order inbox: status tabs (`unpaid`/`to_ship`/`shipped`/`completed`/`cancelled`), platform/store filters, search, inline pipeline actions, **manual order** entry for testing | `GET/POST /pesanan`, `POST /pesanan/{id}/status` |
| `/pesanan/:id` | Order detail: items, pipeline progress, marketplace sync note, actions **Konfirmasi & Proses → Kirim → Selesaikan / Batalkan**, delete (unpaid only) | `GET/DELETE /pesanan/{id}`, `POST /pesanan/{id}/status` |

Desktop has a fixed sidebar. On mobile you get a top bar with a drawer, and tables scroll sideways. There is no analytics dashboard yet (planned for T5).

API types in `src/api/types.ts` mirror `schemas.py` field for field, and `src/api/endpoints.ts` has one function per router route. Do **not** add endpoints the BE doesn't expose. `src/lib/pesanan.ts` mirrors the BE transition table `services._TRANSISI_STATUS`. Tests check both files against the backend.

## Local development

```bash
cp .env.example .env        # VITE_BACKEND_URL
yarn install
yarn dev                    # http://localhost:3000
yarn lint && yarn test && yarn build
```

Recommended local setup: **leave `VITE_BACKEND_URL` empty** so the FE calls `window.location.origin/api/...`. Vite then proxies `/api` to `DEV_PROXY_TARGET` (default `http://localhost:8000`), which keeps the cookie same-origin. Run the backend with `COOKIE_SECURE=false COOKIE_SAMESITE=lax` and `CORS_ORIGINS=http://localhost:3000`.

```bash
DEV_PROXY_TARGET=http://localhost:8000 yarn dev
```

To log in for the first time, run the seed (see below). The default account is `owner@marketplace-erp.internal` / `password123`. **Change or replace it right away** in any real environment.

## Environment variables (FE)

| Var | When | Value |
|---|---|---|
| `VITE_BACKEND_URL` | **build time** | Origin of sm85-arch **without** `/api`, e.g. `https://api.example.com`. The FE appends `/api/marketplace-erp`. A trailing `/api` is removed automatically. |

## Deploy: DigitalOcean App Platform (static site)

> This repo doesn't create or change any DO app. These are manual steps.

1. **Create → App → GitHub** `sm85-code/frontend-marketplace-erp`, branch `main`, component type **Static Site**.
2. Build command: `yarn install --frozen-lockfile && yarn build`
3. Output directory: `dist`
4. **Catchall document: `index.html`**. This makes SPA routes like `/pesanan/123` and `/oauth/shopee/callback/...` work on refresh and when Shopee redirects back. In an app spec it's `catchall_document: index.html`.
5. Env: `VITE_BACKEND_URL=https://<BE_ORIGIN>` with scope **Build time**. Changing it requires a rebuild.
6. Node: `package.json` sets `engines.node = 22.x`, and `.yarnrc` has `ignore-engines true`.
7. After the first deploy, note the FE origin (e.g. `https://marketplace-erp-xxxxx.ondigitalocean.app` or a custom domain) and put it in the backend env below.

Minimal app spec snippet:

```yaml
static_sites:
  - name: frontend-marketplace-erp
    github: { repo: sm85-code/frontend-marketplace-erp, branch: main, deploy_on_push: true }
    build_command: yarn install --frozen-lockfile && yarn build
    output_dir: dist
    catchall_document: index.html
    envs:
      - { key: VITE_BACKEND_URL, value: "https://<BE_ORIGIN>", scope: BUILD_TIME }
```

## Required backend env (sm85-arch)

| Var | Purpose |
|---|---|
| `DATABASE_URL_MARKETPLACE_ERP` | Dedicated Postgres for the tenant (`postgresql://...`; the connection always uses SSL) |
| `MARKETPLACE_ERP_SEED_SECRET` | Secret for `GET /api/marketplace-erp/seed-now` (header `X-Marketplace-Erp-Seed-Secret`). Creates the tables, the default owner and the DEFAULT warehouse |
| `JWT_SECRET_MARKETPLACE_ERP` | Recommended per-tenant JWT secret (falls back to `JWT_SECRET`) |
| `CORS_ORIGINS` | **Add the FE origin** (comma-separated, no trailing slash). Without it, the browser blocks responses and every POST/PATCH/DELETE gets `403 Permintaan lintas situs ditolak` from the CSRF middleware |
| `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` | Production defaults, required because the FE and BE are on different origins |
| `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY` | Shopee Open Platform app credentials. Without them, "Hubungkan Shopee" returns 503 |
| `SHOPEE_ENV` | `sandbox` (default, `partner.test-stable.shopeemobile.com`) or `production` |
| `SHOPEE_REDIRECT_URI` | Fallback only. The FE always sends `redirect_uri=https://<FE_ORIGIN>/oauth/shopee/callback/<akun_id>`. Recommended value: `https://<FE_ORIGIN>/oauth/shopee/callback` (the BE appends the akun id itself) |
| `SHOPEE_LIVE_SYNC` | Leave empty or `false` until the partner is approved. The "pull orders" button and push-on-confirm then soft-fail with a clear message |

Seed once after deploy:

```bash
curl -H "X-Marketplace-Erp-Seed-Secret: $MARKETPLACE_ERP_SEED_SECRET" \
  https://<BE_ORIGIN>/api/marketplace-erp/seed-now
```

### Shopee OAuth flow

1. Create the store on the **Toko** page (status `belum_terhubung`).
2. Click **Hubungkan Shopee**. The FE calls `GET /oauth/shopee/start?akun_id=…&redirect_uri=https://<FE>/oauth/shopee/callback/<akun_id>`, then sends the browser to `authorize_url`.
3. Shopee redirects to `https://<FE>/oauth/shopee/callback/<akun_id>?code=…&shop_id=…`.
4. The FE calls `GET /api/marketplace-erp/oauth/shopee/callback/<akun_id>?code=…&shop_id=…`. The BE exchanges the code, stores the tokens and `shop_id`, and sets status `terhubung`.

In the **Shopee Open Platform console**, register the FE domain as the app's redirect URL domain. Shopee rejects redirects to unregistered domains.

### Cross-site cookie note

The login cookie is `SameSite=None; Secure` and set by the BE origin. Browsers that block third-party cookies (Safari/iOS by default, and Chrome with the setting turned on) won't send it when the FE and BE are on **different sites**. Two `*.ondigitalocean.app` subdomains count as different sites. For reliable logins, put both under one domain (e.g. `erp.example.com` + `api.example.com`).

## Tests

`yarn test` runs Vitest (node env) on:

- `endpoints.test.ts`: every API call uses the exact method, path and params from the BE router, with cookie credentials.
- `pesanan.test.ts`: the pipeline matches the BE `_TRANSISI_STATUS` table.
- `forms.test.ts`: zod schemas and payload mappers, e.g. PATCH produk never sends `stok`, empty token fields never clear stored tokens, and a stock-out adjustment sends a negative `qty_delta`.
- `helpers.test.ts`: backend URL normalisation, FastAPI error parsing, open-redirect guard, Shopee callback parsing.

CI (GitHub Actions, Node 22) runs `yarn install --frozen-lockfile` → `yarn lint` → `yarn test` → `yarn build`.
