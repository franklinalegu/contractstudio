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

Data lives in browser localStorage. Download a backup regularly — encrypted backup is recommended (plain JSON contains client PII in readable form).

## Data retention

Client PII (names, contacts, signatures) stays only in this browser + whatever backups/signing files you export. Sharing files (`sign-<ref>.html`) and plain backups both contain PII — send only to the client, delete exports you no longer need, and keep backups no longer than the business relationship plus statutory archiving requires.

## Deploy (GitHub Pages + subdomain)

Push `main` — the `pages.yml` workflow publishes this folder automatically.

1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Subdomain: DNS `CNAME contracts → <user>.github.io`, then Pages → Custom domain: `contracts.mrjamesbrandltd.com` (HTTPS auto-enforced).
3. Open the live URL once and set the **Admin login** password in Settings.
