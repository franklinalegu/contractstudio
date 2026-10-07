# Contract Studio · MRJAMESBRAND LTD

Prepare, sign, and invoice design contracts. One folder, no build step, no database, no account. Data stays in the browser on the device that runs it.

## Run it

Double click **`start-server.bat`**, then open http://127.0.0.1:8080

Any static server works as well: `python -m http.server 8080` from this folder. For the morning auto start routine, see `morning-start.bat`.

## What it does

* **Dashboard**: contract and invoice counts, pipeline by status, money outstanding against money collected, plus a needs attention strip when quotes are expiring, signatures are pending, or invoices are overdue
* **Contracts**: new, edit, list, clone, status flow DRAFT to SENT to SIGNED
* **Editor**: side form plus live A4 preview where every preview cell edits inline
* **Sign off**: draw on pads for designer plus client, in the studio or via a signing file
* **Share for signing**: a single `sign-REF.html` file the client opens on any device, signs, and returns as a short code you paste back
* **Invoices**: raised from signed contracts or standalone, 7.5% VAT, USD or NGN, discount plus coupon support, deposit against balance tracking, mark PAID
* **VAT is optional**: tick Remove VAT on any contract or invoice to take it off. Totals and documents then read No VAT charged.
* **Clients**: auto issued IDs such as `CLT-MJB-0001`, with billed and owed totals per client
* **Service templates**: 19 prefilled offerings so a new contract starts from real deliverables, phases, deposit, and VAT
* **Backup and restore**: the whole studio as one file, plain or password encrypted
* **Print and PDF**: browser print with a document only stylesheet
* **Studio logo**: uploaded once in Settings, printed on invoices only

## Services

| Service | Deposit | VAT |
|---|---|---|
| Brand Identity | 75% | 7.5% |
| Logo Design | 75% | 7.5% |
| Web Design | 75% | 7.5% |
| Consulting | 100% | 7.5% |
| Training / Workshop | 100% | 7.5% |
| AI Mastery | 100% | 7.5% |
| Webinar Branding | 75% | 7.5% |
| Social Media Templates | 75% | 7.5% |
| Social Media Management | 75% | 7.5% |
| Wedding Branding | 75% | 7.5% |
| Presentations | 75% | 7.5% |
| Company Profile | 75% | 7.5% |
| Personal Branding | 75% | 7.5% |
| Digital Illustrations | 75% | 7.5% |
| Ads Placement | 100% | 7.5% |
| Digital Marketing | 75% | 7.5% |
| Web Management | 75% | 7.5% |
| Web Applications / Software | 75% | 7.5% |
| Blank contract | 75% | 7.5% |

Each tile prefills scope, deliverables, phases, payment options, deposit, and VAT. Anything remains editable after creation. Save any finished contract as a new template from the editor.

## Money rules

* Quote figures are before VAT. VAT defaults to 7.5%, stays adjustable per record, and can be removed per record with Remove VAT.
* Deposit is 75% or 100% depending on service. Files release only after the balance clears. Rights transfer on final payment.
* Every quote holds for 30 days from the document date. The dashboard flags quotes with 7 days or less remaining.
* Invoices fall due 14 days after issue. Standalone invoices support a percentage discount plus VAT.
* Part payment shows as PART until deposit and balance are both received, at which point the invoice flips to PAID.
* Coupons live in the Coupons view as percent or flat cuts, each for single use with an optional expiry date. Every use records client plus service. Apply a code while creating an invoice or on any unpaid invoice. The cut lands after discount and before VAT, and prints on the invoice.

## Security model

* **First run setup.** No password ships with the studio. The first screen forces creation of an admin username plus password. The password is stored only as a salted SHA 256 hash, never as plain text.
* **Locking.** Unlock lasts for the browser tab only. Closing the tab always asks for login again. Ten minutes without input locks the studio automatically.
* **Encrypted backups.** Recommended for every backup. Protected by a password using PBKDF2 key derivation plus AES GCM 256 bit encryption. A wrong password cannot open the file. Plain JSON export stays available but asks for explicit confirmation first, since it contains readable client PII.
* **Return codes.** Each signing file stamps its contract reference plus issue date into the code. Pasting a code from a different contract is rejected. Pasting a code that was already applied raises a warning before anything is replaced.
* **Sharing care.** Exporting a signing file asks for confirmation first, since the file carries client PII. Send it direct to the client only, never to a group.
* **Hardened rendering.** Client supplied codes are validated on intake, all output is escaped, inline handlers are gone, and a Content Security Policy ships with the page.

## Data, backup, and retention

* All records live in browser localStorage under one key. There is no server copy. If the browser profile is wiped, only the last downloaded backup can restore the studio.
* Recommended routine: encrypted backup after every signed contract and every paid invoice. Keep the backup password with whoever must restore the file.
* Client PII such as names, contacts, and signatures exists in three places only: this browser, exported backups, and signing files. Delete exports that are no longer needed. Keep backups only for the length of the business relationship plus whatever archiving the law requires. See `GUIDE.md` for the full routine.

## Deploy on GitHub Pages with a subdomain

Push `main`. The `pages.yml` workflow publishes this folder automatically.

1. Repo, then Settings, then Pages, then Source: **GitHub Actions**.
2. DNS: `CNAME contracts` pointing to `<user>.github.io`. Then Pages, then Custom domain: `contracts.mrjamesbrandltd.com`. HTTPS is enforced automatically.
3. Open the live URL once and create the admin password on the first run screen.

## Website

The main studio website lives at https://github.com/franklinalegu/mrjamesbrand and embeds this studio at its contracts route from `apps/web/public/studio`. That folder is a mirror only. Change code here, then sync it from the website repo root with `node scripts/sync-contract-studio.mjs` before committing there.

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell, sidebar, and mobile nav |
| `app.js` | The whole studio: store, views, documents, signing files, crypto |
| `styles.css` | Brand styling plus print rules |
| `start-server.bat` | Local server launcher |
| `morning-start.bat` | Morning routine: server plus agenda popup |
| `SECURITY_WORKLOG.md` | Security plan and progress log |
| `GUIDE.md` | Refined operator and care manual |
| `PRD.md` | Product requirements document for the studio |
| `btn-test.mjs`, `roundtrip-test.mjs`, `lock-test.mjs`, `logo-test.mjs`, `audit-test.mjs` | Test suites, run with node |

## Tests

Run from this folder:

```
node btn-test.mjs
node roundtrip-test.mjs
node lock-test.mjs
node logo-test.mjs
node audit-test.mjs
```

They cover buttons and wiring, encrypted backup round trip plus clone, lock plus auto lock timing, logo handling, and audit items such as code reuse guards, clone, validity countdown, and retired template cleanup.

## Troubleshooting

1. **Login appears on a fresh open.** Expected. Unlock lives in the tab only, so a closed tab always asks again.
2. **Studio looks empty on a new device or browser.** Storage is per browser. Restore the latest backup through Settings.
3. **An old service tile still shows.** Retired templates clean themselves on load. Refresh once after updating.
4. **Return code rejected.** It belongs to a different contract, or it was typed incompletely. Generate a fresh code from the matching signing file.
5. **Encrypted backup will not open.** The password differs from the one set at export. There is no recovery path, so store backup passwords carefully.
6. **Print shows app chrome.** Use the Print / PDF button inside a view so only the document prints.
