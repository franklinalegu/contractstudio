# Contract Studio Guide

The refined operator and care manual for daily studio work. For setup, deployment, and file layout, see `README.md`.

## 1. First run

1. Open the studio. The first screen asks for an admin username plus password, minimum 8 characters.
2. The studio unlocks immediately after creation. Later visits ask for login.
3. The unlock dies with the tab. Closing the tab always asks for login again. Ten quiet minutes lock it too.

## 2. From enquiry to paid invoice

1. Dashboard, then New Contract, then pick the service closest to the job.
2. Fill client, project, deliverables, money, payment methods, and phases. The preview updates live, and any preview cell edits inline.
3. Save, then Mark Sent. The quote is now live with a 30 day validity clock.
4. Collect the deposit. Record nothing yet; the invoice comes after signing.
5. Sign as designer on the document view. Share the signing file for the client signature, or sign together on one screen.
6. Apply the client return code. Status flips to SIGNED once both signatures exist.
7. Raise invoice. It arrives prefilled with deposit and balance lines.
8. Tick Deposit then Balance as each payment lands. Status reads PART in between and PAID at the end.
9. Download an encrypted backup. This closes the loop on every job.

## 3. Client signing by return code

1. On the signed ready contract, choose Share for signing. Confirm the PII prompt and send the downloaded file direct to the client.
2. The client reviews, fills details, draws a signature, then taps Generate return code and sends the code back on chat.
3. Choose Apply client code and paste it. The studio checks three things: the code is well formed, it names the open contract, and it was not applied before.
4. A reused code triggers a warning with the choice to stop or replace. A code from another contract is rejected outright.

## 4. Invoices and money

1. Contract invoices split deposit and balance automatically, VAT inclusive.
2. Standalone invoices suit retainers and extras: add service lines, set VAT and discount percent, link a contract when one applies. Tick Remove VAT on any invoice that should carry none. Type a coupon code to cut the bill by percent or flat amount.
3. Coupons are created in the Coupons view with a code, a kind, a value, and an optional expiry date. Each coupon works once. Spending one records client ID plus name plus service plus invoice. Removing it from that same invoice frees it again. Deleting a coupon leaves past invoices untouched.
3. Due date defaults to 14 days out. Overdue invoices surface on the dashboard.
4. Outstanding and collected totals group by currency, so USD and NGN never merge into one misleading figure.
5. Official studio accounts print on every invoice. Payment narration should quote the invoice reference.

## 5. Clients

1. Client records form themselves from saved contracts, each with a stable ID such as `CLT-MJB-0001`.
2. Add or edit from the Clients view. Saving updates the record plus every matching contract and invoice at once.
3. The Clients table shows contract count, invoice count, billed, and owed per client.
4. Deletion is guarded. A client with contracts or invoices cannot be deleted until those records go first.

## 6. Templates

1. Nineteen services ship ready to use. Anything about them can change per contract without affecting the template.
2. To bottle a winning setup, open a finished contract and choose Save as template with a clear name.
3. To remove a custom template, delete it from Settings. Built in templates return on next load by design.
4. Retired built in templates remove themselves automatically, so outdated tiles never linger.

## 7. Backup and restore routine

1. Encrypted backup is the default habit. Settings, then Download encrypted backup, then set a strong password twice.
2. Name the file by date on download and keep at least two generations, for example this month plus last month.
3. Restore accepts both formats. Plain files restore at once. Encrypted files ask for the backup password first.
4. Plain export exists for inspection and migration, and it always asks for confirmation because the contents are readable.
5. After restore, glance at counts on the dashboard before continuing work.

## 8. Lock management

1. Change the password from Settings whenever team access changes.
2. Remove the lock only on a private device that nobody else touches.
3. On shared machines, use the Lock nav item before walking away. The idle timer is a safety net, not a substitute.

## 9. PII and retention practice

1. Treat signing files, plain backups, and screenshots as client records. Send signing files to the client only.
2. Confirm every export prompt honestly. If the recipient list grew, stop and rethink.
3. Delete client exports once the job plus warranty window closes, keeping only what statute or tax filing demands.
4. When a client asks what is held, the answer is simple: browser records plus backups plus signing files, nothing on any server.

## 10. Troubleshooting

1. **Quote shows EXPIRED.** The 30 day window passed. Clone the contract to reissue with a fresh date.
2. **PART never flips to PAID.** Both Deposit and Balance ticks must land. Ticking both at once is fine for full payments.
3. **Client ID looks unfamiliar.** IDs derive from first use order, so early test records own the low numbers. Harmless.
4. **Logo missing on a contract.** By design. The logo prints on invoices only, keeping contracts logo free.
5. **Signing file looks plain on the client phone.** It is a single self contained file with print rules included. Ask the client to open it in a full browser for best results.
