import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
// 1. no seeded hash ships
assert.ok(!src.includes("7b81f654e58ca14746e750df6a268d1f5a8fee8524e1bffdef7ddf12f71a3c95"), "seeded hash still present");
assert.ok(src.includes('lockHash: ""'), "default lockHash must be empty");
// 2. first-run setup forces a fresh password
for (const s of ["needsSetup", "vSetup", "trySetup", "First run", "Create password"]) assert.ok(src.includes(s), "missing setup: " + s);
// 3. auto-lock: 10 min idle; NO instant lock on tab switch (idle timer covers hidden tabs)
assert.ok(src.includes("10 * 60 * 1000"), "missing 10-min idle threshold");
assert.ok(src.includes("setInterval("), "missing idle timer");
assert.ok(!src.includes("visibilitychange"), "must not instant-lock when tab hidden");
console.log("lock-test: green (incl. auto-lock timer)");
