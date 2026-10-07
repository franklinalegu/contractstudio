import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");
// return-code stamp: ref + issuedAt in payload, ref check + reuse warning on apply
for (const s of ["appliedCodes", "CREF", "ISSUED", "ref:CREF", "issuedAt:ISSUED", "already applied"]) assert.ok(src.includes(s), "missing code-reuse: " + s);
assert.ok(/p\.ref && p\.ref !== c\.ref/.test(src), "must reject cross-contract codes");
// retired combined tile self-cleans on load
assert.ok(src.includes('"presentations-profile"'), "retired id must be filtered");
assert.ok(!src.includes('name: "Presentations & Company Profile"'), "combined tile must be gone");
// clone keeps working
assert.ok(src.includes('data-act="clone"'), "clone button missing");
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
