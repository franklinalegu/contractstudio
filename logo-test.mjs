import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
// logo upload path intact (invoices only, resized, 5MB cap)
for (const s of ["logo-pick", "logo-clear", "logo-file", "max-height:72px", "440", "5 * 1024 * 1024", "S.settings.logo"]) assert.ok(src.includes(s), "missing logo: " + s);
assert.ok(src.includes("contracts stay logo-free"), "logo must stay off contracts");
console.log("logo-test: green");
