# ERP UI/UX focus audit

Reviewed shared layout/help components and page controls across dashboard, catalogue,
orders/returns, chat, products/mappings, promotions, advertising, store performance,
settlement and staff management.

Findings and changes:
- A persistent page-guide row and repeated explanation panels displaced working data.
  Page guides now open from Help in the sidebar (More on mobile); contextual
  explanations open in compact dialogs. Instructions are available on demand.
- Order and catalogue headers mixed routine work with occasional actions. Keep
  synchronization visible; group returns/manual orders and catalogue publication/
  promotions in Other actions. Catalogue column presets live in filters.
- Replace visible Segarkan labels and related instructions with Refresh.
- Preserve data disclosures (order status details), product-management controls,
  synchronization timestamps, warnings, validation and permissions.

Follow-up recommendation: use one primary action per task section, keep filters
collapsed initially, and retain period/store scope alongside financial metrics.
Do not hide warnings or irreversible-action confirmations as general help.

Validation: production build, lint, and mobile/desktop browser checks with mocked
API responses. Live Shopee behavior and production deployment are outside these
UI-only checks.
