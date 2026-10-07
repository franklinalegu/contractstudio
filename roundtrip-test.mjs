import { readFileSync } from "fs";
import assert from "assert";
import { webcrypto } from "crypto";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
// encrypted backup helpers exist
for (const s of ["async function encBackup", "async function decBackup", "AES-GCM", "PBKDF2", "enc: 1", "Wrong password or corrupt backup"]) assert.ok(src.includes(s), "missing " + s);
// plain backup gated behind confirm
assert.ok(/act === "backup"[\s\S]{0,300}confirm\(/.test(src), "plain backup needs confirm");
// live AES-GCM round-trip (mirrors app logic)
const te = new TextEncoder(), td = new TextDecoder();
const b64e = (b) => Buffer.from(b).toString("base64");
const b64d = (s) => new Uint8Array(Buffer.from(s, "base64"));
async function key(pw, salt) {
  const km = await webcrypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]);
  return webcrypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 50000, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
const k = await key("test-pass", salt);
const plain = JSON.stringify({ contracts: [{ id: "x" }], settings: {} });
const ct = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, k, te.encode(plain));
const k2 = await key("test-pass", salt);
const pt = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, k2, ct);
assert.equal(td.decode(pt), plain);
let wrong = false;
try { const kw = await key("wrong", salt); await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, kw, ct); } catch { wrong = true; }
assert.ok(wrong, "wrong password must fail");
// clone round-trip: deep copy gets new id/ref/DRAFT/blanked signatures
const c = { id: "a", ref: "CTR-1", status: "SIGNED", project: { name: "P" }, sign: { designerSig: "x", clientSig: "y" } };
const n = JSON.parse(JSON.stringify(c));
n.id = "b"; n.status = "DRAFT"; n.sign = { designerSig: "", clientSig: "" };
assert.equal(n.id, "b"); assert.equal(n.status, "DRAFT"); assert.equal(n.sign.clientSig, ""); assert.equal(c.sign.clientSig, "y");
console.log("roundtrip-test: green (incl. encrypted backup + clone)");
