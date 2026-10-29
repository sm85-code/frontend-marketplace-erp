# AGENTS.md — frontend-marketplace-erp

## Aturan untuk agen (Hermes / Codex)
- Kerja di worktree sendiri: `git worktree add ../wt/<id> -b hermes/<id>-<topik> origin/main`. Satu tugas per repo dalam satu waktu.
- Jangan `git reset --hard`, jangan force-push, jangan hapus data/migrasi, jangan commit secret.
- Selalu lewat PR; merge hanya setelah owner bilang "ya" dan CI hijau.
- Jalankan tes terkait + build sebelum PR. Area kritis (keuangan, pesanan, DB) wajib tes penuh di CI sebelum merge.
- Pesan commit/PR singkat; jelaskan apa yang diubah dan cara mengujinya.

## Perintah
- Lint: `yarn lint` · Tes: `yarn test` · Build: `yarn build`
- Build produksi selalu dengan `.env.production` (jangan build tanpa itu untuk deploy).
- Di server repo ada di `/opt/data/kode/frontend-marketplace-erp`.
