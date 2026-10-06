# Contract Studio · MRJAMESBRAND LTD

Prepare, sign, and invoice design contracts. Standalone, no build step, no database.

## Run it

Double-click **`start-server.bat`**, then open http://127.0.0.1:8080
(or serve the folder any way you like: `python -m http.server 8080`).

## What it does

- **Dashboard** — contract/invoice counts, outstanding balance
- **Contracts** — new/edit/list, status flow DRAFT → SENT → SIGNED
- **Editor** — side form + live A4 preview; every preview cell edits inline
- **Sign off** — draw-on pads for designer + client
- **Share for signing** — self-contained `sign-<ref>.html` for the client (works over WhatsApp); apply their return code back
- **Invoices** — raised from signed contracts, 7.5% VAT, USD/NGN, mark PAID
- **Backup/Restore** — whole studio as one JSON file (Settings)
- **Print / PDF** — browser print, document-only stylesheet

Data lives in browser localStorage. Download a backup regularly.
