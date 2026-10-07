# Contract Studio · Product Requirements Document

Product of MRJAMESBRAND LTD. Companion to `README.md` for setup plus `GUIDE.md` for daily operation.

## 1. Product summary

Contract Studio is the contracting arm of the studio. It turns each service in the catalogue into a signed agreement plus a paid invoice, in the visual language of the brand. One folder, no build step, no database, no server. All records live in the browser on the studio device, with file based backup for continuity.

## 2. Problem

Design work was agreed in chat threads and scattered documents. Scope drifted, deposits arrived late, files released before balances cleared, and no single record showed who owed what. The studio needed one place where a quote becomes a contract, a contract becomes signatures, and signatures become paid invoices.

## 3. Goals

1. Any service in the catalogue becomes a sendable contract in minutes.
2. Signing works for remote clients on phones, with the signature returning as a verifiable code.
3. Every figure stays VAT correct in USD or NGN, with deposit against balance tracked to PAID.
4. Client data stays private by default: local first, encrypted backups, explicit consent on every export.
5. The tool runs offline capable on a laptop and deploys as a static site with zero maintenance.

## 4. Non goals

1. No team accounts or roles. One admin lock guards one studio.
2. No online payments. Invoices instruct payment to official studio accounts; receipts are confirmed by the principal.
3. No legal automation. Fixed legal text ships with each contract; trademark and registration advice stays outside the product.
4. No marketing site features. The public website lives separately; the studio embeds only the contracting bundle.

## 5. Users

1. **Studio Principal.** Creates contracts, sends quotes, signs as designer, raises invoices, tracks money, guards backups.
2. **Client.** Reviews the signing file, fills details, signs on a touch screen, returns the code. Never sees the studio internals.
3. **Accounts reviewer.** Future reader of invoices and totals, for example at tax time. Served today through printed PDFs and backups.

## 6. Functional requirements

### Contracts

1. Create from a service template or a blank base.
2. Edit client, project, deliverables, money, payment methods, and phases, in form plus live preview, with every preview cell editable inline.
3. Clone any contract into a fresh draft with new reference, reset status, and cleared signatures.
4. Status flows DRAFT to SENT to SIGNED, forward only, with both signatures required before SIGNED.
5. Expired quotes clone into reissues with fresh dates.

### Signing

1. Draw on pads for designer and client on one screen.
2. Export a single signing file per contract that works from a chat app share.
3. Generate a return code inside the signing file that stamps contract identity, contract reference, and issue date.
4. Apply pasted codes with three checks: well formed, matching the open contract, and not previously applied.
5. Warn on reuse, reject cross contract codes, and flip SENT to SIGNED once both signatures exist.

### Invoices

1. Raise from a signed contract with deposit and balance lines prefilled, VAT inclusive.
2. Build standalone invoices with free service lines, VAT percent, and discount percent, optionally linked to a contract.
3. Track deposit received and balance received separately. Display PART until both land, then PAID.
4. Total outstanding and collected grouped by currency, never merged across currencies.
5. Apply reusable coupons as percent or flat cuts at invoice creation or on unpaid invoices, landing after discount and before VAT and printing on the invoice. Each coupon carries single use plus an optional expiry date, and each use records client plus service plus invoice.
5. Print the official studio accounts plus the invoice reference as payment narration on every invoice.

### Clients

1. Issue a stable client ID on first use and reuse it across contracts and invoices.
2. Show contract count, invoice count, billed, and owed per client.
3. Editing a client updates every matching record at once.
4. Guard deletion while contracts or invoices reference the client.

### Templates

1. Ship the full service catalogue with scope, deliverables, phases, deposit, and VAT per service.
2. Seed missing templates on load without touching user edits.
3. Allow saving any contract as a new template and deleting custom templates.
4. Retire superseded templates automatically on load.

### Backup and settings

1. Export plain JSON only after explicit confirmation.
2. Export password encrypted backups with PBKDF2 key derivation plus AES GCM encryption.
3. Restore both formats, asking for the password on encrypted files and rejecting wrong passwords without detail.
4. Keep studio identity, contact, default payment methods, logo, and admin credentials in Settings.
5. Upload a logo that prints on invoices only, resized automatically with a size cap.

### Dashboard

1. Show counts plus pipeline by status and money outstanding against collected.
2. Surface needs attention: pending signatures, quotes near expiry, overdue invoices.
3. Stay readable at zero records with a first run path to the first contract.

## 7. Money and legal rules

1. Quotes are before VAT. VAT defaults to 7.5%, stays adjustable per record, and can be removed per record with a Remove VAT switch.
2. Deposit is 75% or 100% by service. Work starts on deposit. Files release on balance. Rights transfer on final payment.
3. Quotes hold for 30 days. Invoices fall due 14 days after issue.
4. Fixed legal text covers deposits, securing, cancellation, suspension, fonts, ownership, trademark limits, and naming responsibility.

## 8. Security and privacy requirements

1. No credential ships in the product. First run forces creation of a fresh admin password.
2. Passwords persist as salted SHA 256 hashes only.
3. Unlock is per tab. Idle ten minutes locks. Closing the tab always requires login again.
4. Every export carrying client PII asks for confirmation first.
5. Retention guidance ships in product docs: browser plus backups plus signing files are the only stores, and exports are deleted when no longer needed.

## 9. UX requirements

1. One primary action per view. Secondary actions stay visually quiet.
2. Every action answers within a blink with a toast, a status flip, or a new view.
3. Touch targets suit phones. Signing pads work with finger input.
4. Print views contain the document only, never app chrome.
5. Empty, loading, and error states read in plain words, never in codes.

## 10. Data model

1. **Contract.** Reference, status, creation date, client block, project block, money block, payment methods, phases, signature block, template origin.
2. **Invoice.** Reference, linked contract or standalone, status, currency, dates, client snapshot, line items, subtotal, discount, coupon snapshot, VAT, deposit tick, balance tick.
3. **Client.** Stable ID, name, business, email, phone.
4. **Template.** ID, name, scope, options, deliverables, phases, deposit, VAT, payment defaults.
5. **Settings.** Studio identity, contacts, defaults, logo, admin username, lock hash.
6. **Applied codes.** Last return code per contract for reuse detection.
7. **Coupon.** Code, kind, value, active flag, optional expiry date, single use record with client plus service plus invoice.

## 11. Acceptance criteria

1. All suites pass: buttons, round trip including encrypted backup and clone, lock including auto lock timing, logo, audit including code reuse, clone, validity, and retired template cleanup.
2. A contract travels enquiry to PAID without leaving the studio except for the client signing file and the payment itself.
3. A wrong backup password never opens a file. A foreign return code never applies.
4. A fresh Desktop zip plus a tagged commit plus a pushed main branch close every change.

## 12. Rollout and operations

1. Local use runs from `start-server.bat` on the studio machine.
2. Public use deploys from `main` through GitHub Actions to the custom subdomain, followed by first run password creation on the live URL.
3. The website embeds the static bundle, refreshed from the source folder on every studio change.
4. Backup discipline from `GUIDE.md` section 7 is part of the definition of done, not an afterthought.

## 13. Risks and mitigations

1. **Browser data loss.** Mitigated by the encrypted backup routine after every signed contract and paid invoice.
2. **Shared device exposure.** Mitigated by per tab unlock, idle lock, and the manual Lock item.
3. **Quote confusion.** Mitigated by 30 day validity, expiry flags, and clone to reissue.
4. **Payment disputes.** Mitigated by deposit before work, files after balance, printed accounts, and reference narrations.
5. **Scope drift.** Mitigated by templated deliverables plus fixed legal text on every contract.

## 14. Future consideration

Multi user roles, online payment confirmation, automated reminders, and analytics stay out of scope until the single operator flow is proven in production over several paid engagements.
