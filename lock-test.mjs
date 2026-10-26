import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
// 1. no seeded password hash ships in the client
assert.ok(!/lockHash:\s*"[^"]+"/.test(src), "no password hash may be seeded in the client");
// 2. every device opens on the login screen; first-run setup is gone
for (const s of ["vLock", "tryUnlock", "10 * 60 * 1000", "setInterval(", "api/auth.php",
  "?action=login", "?action=change-password", "retryAfter"]) assert.ok(src.includes(s), "missing lock: " + s);
assert.ok(!src.includes("setupform"), "no set-password screen may ship");
assert.ok(!src.includes("trySetup"), "no client-side setup path may ship");
assert.ok(!src.includes("vSetup"), "no client-side setup view may ship");
assert.ok(!src.includes("needsSetup"), "login is mandatory on every device");
// 3. the password is verified by the server, not by the browser
assert.ok(!src.includes("=== S.settings.lockHash"), "password must be checked by the server");
assert.ok(!src.includes("mjb-lock-attempts"), "throttle must be enforced by the server");
assert.ok(!src.includes("sha("), "no client-side password hashing");
// 4. the lock cannot be removed from the client
assert.ok(!src.includes("remove-lock"), "the contract lock must not be removable");
// 5. auto-lock: 10 min idle; NO instant lock on tab switch (idle timer covers hidden tabs)
assert.ok(!src.includes("visibilitychange"), "must not instant-lock when tab hidden");
console.log("lock-test: green (server auth, auto-lock timer)");
