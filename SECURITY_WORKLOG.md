# Security + Features Worklog — starts 2026-10-07 10:00

## Baseline (tonight)
- 8 commits, all suites green (~50 checks), Desktop zip current.
- Known posture: admin lock is deterrent-grade; data in plain localStorage/JSON.

## Threats to fix (in order)
1. **Seeded credential hash in repo** — first-run setup must force a fresh password instead of shipping one. Remove the baked-in hash.
2. **No auto-lock** — add idle lock (10 min) + lock when tab hidden.
3. **Plain-text backups** — password-encrypted backup export (AES-GCM via WebCrypto), plain export only with explicit confirm.
4. **Return-code reuse** — stamp codes with issue date + contract ref; studio warns if a code is applied twice.
5. **PII hygiene** — confirm-before-export nudge on signing files; document retention note in README.

## Features to build
1. Clone/duplicate contract.
2. Deposit-paid vs balance-paid tracking per invoice.
3. 30-day quote-validity countdown on dashboard.
4. Client list from auto-generated IDs (totals per client).

## Acceptance
- btn, roundtrip, lock, logo, audit suites green.
- New tests: auto-lock timer, encrypted backup round-trip, code-reuse warning, clone, validity countdown.
- Fresh Desktop zip + commit. Push to GitHub if network allows.

## Test baseline command
`node btn-test.mjs`, `roundtrip-test.mjs`, `lock-test.mjs`, `logo-test.mjs`, `audit-test.mjs` (in Temp\opencode).

## Progress 2026-10-07 ~10:07
- All 5 threats done in app.js (v6): no seeded hash + forced first-run setup; 10-min idle + tab-hidden auto-lock; AES-GCM encrypted backup (PBKDF2) with plain-export confirm; return codes stamped with ref + issue date, reuse warns; share-file PII confirm + README retention note.
- Features 1–4 were already shipped (clone, PART tracking, validity countdown, clients view) — covered by tests.
- 5 suites green. Fresh Desktop contract-studio.zip rebuilt.

## Round 2 hardening
- Stored XSS audit: every `${}` interpolation checked. Static legal text, numeric totals, generated IDs, and pre escaped settings are safe by construction.
- Real hole closed: crafted return codes could plant a hostile signature into an unescaped image tag. Intake now accepts PNG data URLs only.
- Depth: escaping now covers single quotes, print buttons moved off inline handlers, and a Content Security Policy ships in `index.html`.
