# Order Bridge UI

Backend companion: https://github.com/sm85-code/sm85-arch/pull/505

Kelola Toko now separates Toko Internal and Toko Reseller. Internal shops show source, stable EasyBoss identity, sync status and activity; Web App stays in the existing shop list. The existing Shopee connected-account tab remains available.

OrderBridgePanel offers status/heartbeat, receipt totals, scan history, source/error details, shop preview with explicit legacy-shop linking, fresh scans/retries and enable/pause. Mutations require `toko_penjualan:tulis` in both UI and backend. Unconfigured/unverified upstream disables import and automation controls. Preview fingerprint is mandatory when applying shop sync.

Deletion checks relations before confirmation and the backend rechecks at deletion. Shops with relations offer deactivation, preserving history. Source-managed shop name/type/platform cannot be manually changed. No old shops are automatically removed.

Real integration remains gated: the task environment has no authorized read session or implementation access to live EasyBoss MCP. The backend adapter's bridge-v1 contract is explicitly internal and fixture-tested; no complete native EasyBoss item/payment/directory response is claimed verified. See backend docs/order-bridge/{README,CONTRACT,VALIDATION}.md for configuration, additive migration, native source evidence, activation and rollback.

Validation: TypeScript and Vite build pass; existing full suite 90 files / 521 tests passed; 3 added bridge tests pass. Lint passes with existing repository warnings. CI reruns the final suite/build. No production write or deployment was performed. Main's existing workflow auto-deploys: merge requires the separate production authorization described in the backend PR.
