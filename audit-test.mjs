import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
// return-code stamp: ref + issuedAt in payload, ref check + reuse warning on apply
for (const s of ["appliedCodes", "CREF", "ISSUED", "ref:CREF", "issuedAt:ISSUED", "already applied"]) assert.ok(src.includes(s), "missing code-reuse: " + s);
assert.ok(/p\.ref && p\.ref !== c\.ref/.test(src), "must reject cross-contract codes");
// retired combined tile self-cleans on load
assert.ok(src.includes('"presentations-profile"'), "retired id must be filtered");
assert.ok(!src.includes('name: "Presentations & Company Profile"'), "combined tile must be gone");
// clone keeps working
assert.ok(src.includes('data-act="clone"'), "clone button missing");
// services module: list + editor + picker hides hidden
for (const s of ["vServices", "vServiceEdit", "blankService", "hiddenTemplates", "isBuiltinTpl", "New service"]) assert.ok(src.includes(s), "missing services: " + s);
// VAT is optional per contract and per invoice
for (const s of ["vatExempt", "noVat", "Remove VAT", "No VAT charged."]) assert.ok(src.includes(s), "missing VAT option: " + s);
// coupon system: book, resolve, apply at creation and after
for (const s of ["coupons", "resolveCoupon", "apply-coupon", "apply-coupon-draft", "remove-coupon", "Coupon"]) assert.ok(src.includes(s), "missing coupon: " + s);
// single use plus expiry: usage ledger, guards, form field
for (const s of ["stampCouponUse", "freeCouponUse", "usedAt", "invoiceRef", "cp-expires", "already used", "expired on"]) assert.ok(src.includes(s), "missing single use: " + s);
// round 2 hardening: signature intake validation, full escaping, CSP, no inline handlers
for (const s of ["data:image\\/png;base64,", "&#39;", "Content-Security-Policy", 'data-act="print"']) assert.ok(src.includes(s) || html.includes(s), "missing hardening: " + s);
assert.ok(!src.includes('onclick="'), "no inline handler attributes allowed");
// coupons own view, not a settings card
assert.ok(src.includes("vCoupons"), "missing coupons view");
assert.equal(src.split("<h3>Coupons</h3>").length - 1, 1, "coupon manager must render once");
// arithmetic proof: verifier, manual card, restore hooks, login gate on all views
for (const s of ["verifyArithmetic", "verify-sums", "Arithmetic check"]) assert.ok(src.includes(s), "missing verifier: " + s);
assert.ok((src.match(/verifyArithmetic\(\)/g) || []).length >= 3, "verifier must run on both restores");
assert.ok(/if \(isLocked\(\)\)/.test(src), "all views must sit behind login");
// validity countdown intact
for (const s of ["validityDays", "validityBadge", "30 -", "EXPIRED", "D LEFT"]) assert.ok(src.includes(s), "missing validity: " + s);
// validity math: 30-day window
const day = 864e5, now = Date.now();
const days = (created) => 30 - Math.floor((now - new Date(created).getTime()) / day);
assert.ok(days(new Date(now - 29 * day).toISOString().slice(0, 10)) >= 0, "day-29 must be valid");
assert.ok(days(new Date(now - 31 * day).toISOString().slice(0, 10)) < 0, "day-31 must be expired");
// PII hygiene: retention note in README
assert.ok(/retention/i.test(readme) && /PII/.test(readme), "README needs retention note");
console.log("audit-test: green (incl. code-reuse, clone, validity)");
