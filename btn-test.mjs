import { readFileSync } from "fs";
import assert from "assert";
const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const has = (s) => { assert.ok(src.includes(s), "missing: " + s); };
// core buttons still wired
for (const a of [`data-act="new"`, `data-act="open"`, `data-act="edit"`, `data-act="clone"`, `data-act="share"`, `data-act="apply-code"`, `data-act="invoice"`, `data-act="save"`, `data-act="paid"`]) has(a);
// new security buttons
has(`data-act="backup-enc"`);
has(`data-act="backup"`);
has(`[data-act='lock']`);
// services module wiring
for (const a of [`data-act="new-service"`, `data-act="edit-service"`, `data-act="save-service"`, `data-act="cancel-service"`, `data-act="del-service"`, `data-act="toggle-service"`, `data-act="add-sd"`, `data-act="add-sp"`]) has(a);
for (const a of [`data-view="services"`]) assert.ok(html.includes(a), "missing nav: " + a);
// clone still creates fresh draft
has(`n.status = "DRAFT"`);
has(`n.sign = { designerName`);
// share has PII confirm
assert.ok(/act === "share"[\s\S]{0,400}confirm\(/.test(src), "share needs confirm");
console.log("btn-test: green");
