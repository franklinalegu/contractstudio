"use strict";
/* MRJAMESBRAND Contract Studio — standalone, localStorage-backed. No build step. */
const KEY = "mjb-contract-studio-v1";
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n, c) => new Intl.NumberFormat("en-NG", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(Number(n) || 0);
/* Subtotal + VAT + deposit/balance. Old contracts without vatPct default to 7.5%. */
function totals(c) {
  const sub = Math.round(Number(c.money.quote) || 0);
  const pct = Number(c.money.vatPct == null ? 7.5 : c.money.vatPct) || 0;
  const vat = Math.round(sub * pct / 100);
  const total = sub + vat;
  const dep = Math.round(total * (Number(c.money.depositPct) || 0) / 100);
  return { sub, pct, vat, total, dep, bal: total - dep };
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

function newFromTemplate(tpl) {
  const c = blankContract();
  if (tpl) {
    c.project.scope = tpl.scope || ""; c.project.summary = tpl.summary || "";
    c.project.options = tpl.options || ""; c.project.deliverables = (tpl.deliverables || []).slice();
    c.duration.phases = JSON.parse(JSON.stringify(tpl.phases || []));
    c.money.depositPct = tpl.depositPct; c.money.vatPct = tpl.vatPct;
    c.pay.m1 = tpl.pay.m1 || S.settings.wm1; c.pay.m2 = tpl.pay.m2 || S.settings.wm2;
    c.templateId = tpl.id; c.templateName = tpl.name;
  } else { c.pay.m1 = S.settings.wm1; c.pay.m2 = S.settings.wm2; }
  return c;
}
function blankContract() {
  return {
    id: uid(), ref: "CTR-MJB-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000)),
    status: "DRAFT", createdAt: todayISO(),
    client: { name: "", business: "", industry: "", email: "", phone: "" },
    project: { name: "", scope: "", summary: "", deliverables: [""], options: "3 initial concepts, 2 revision rounds", revisions: "" },
    money: { currency: "USD", quote: 0, depositPct: 75, vatPct: 7.5 },
    pay: { m1: "", m2: "" },
    duration: { phases: [{ name: "Discovery & Research", weeks: 1 }, { name: "Concept Development", weeks: 2 }, { name: "Refinement", weeks: 1 }, { name: "Final Handover", weeks: 1 }] },
    sign: { designerName: store.data.settings.designer, designerSig: "", clientName: "", clientSig: "", date: "", paymentMethod: "", paymentDate: "", comments: "" }
  };
}

const store = {
  data: { contracts: [], invoices: [], templates: [], clients: [], clientSeq: 1, settings: { designer: "MrJamesBrand Ltd", email: "hello@mrjamesbrandltd.com", social: "@mrjamesbrand", wm1: "Western Union cash pickup", wm2: "World Remit transfer", adminUser: "mrjamesbrandltd", lockHash: "s256:7b81f654e58ca14746e750df6a268d1f5a8fee8524e1bffdef7ddf12f71a3c95" } },
  load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.contracts) this.data = Object.assign(this.data, d); } catch (e) {}
    this.data.settings = Object.assign({ adminUser: "mrjamesbrandltd", lockHash: "" }, this.data.settings);
    if (!Array.isArray(this.data.templates)) this.data.templates = [];
    let seeded = false;
    for (const s of defaultTemplates()) if (!this.data.templates.some((t) => t.id === s.id)) { this.data.templates.push(s); seeded = true; }
    if (!Array.isArray(this.data.clients)) this.data.clients = [];
    /* explicit client records, backfilled from existing paperwork */
    let touched = seeded;
    const seen = {};
    this.data.clients.forEach((r) => { seen[(r.id || ("n:" + String(r.name || "").trim().toLowerCase()))] = r; });
    const ensureRec = (id, name, business, email, phone) => {
      const nm = String(name || "").trim(); if (!nm && !id) return null;
      const k = id || ("n:" + nm.toLowerCase());
      let r = seen[k];
      if (!r) { r = { id: id || "", name: nm, business: business || "", email: email || "", phone: phone || "" }; this.data.clients.push(r); seen[k] = r; touched = true; }
      else { if (business && !r.business) { r.business = business; touched = true; } if (email && !r.email) { r.email = email; touched = true; } if (phone && !r.phone) { r.phone = phone; touched = true; } if (id && !r.id) { r.id = id; touched = true; } }
      return r;
    };
    for (const c of this.data.contracts) {
      if (c.client && c.client.name && !c.client.id) { c.client.id = this.clientIdFor(c.client.name); touched = true; }
      if (c.client && (c.client.id || c.client.name)) ensureRec(c.client.id, c.client.name, c.client.business, c.client.email, c.client.phone);
    }
    for (const i of this.data.invoices) if (i.clientId || i.clientName) ensureRec(i.clientId, i.clientName, "", i.clientEmail, "");
    let maxSeq = this.data.clientSeq || 1;
    this.data.clients.forEach((r) => { const m = String(r.id || "").match(/(\d+)\s*$/); if (m) maxSeq = Math.max(maxSeq, Number(m[1]) + 1); });
    if (maxSeq !== this.data.clientSeq) { this.data.clientSeq = maxSeq; touched = true; }
    if (touched) this.save();
  },
  /* Stable per-client ID: same name always yields the same ID. */
  clientIdFor(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return "";
    const rec = (this.data.clients || []).find((r) => String(r.name || "").trim().toLowerCase() === key && r.id);
    if (rec) return rec.id;
    const hit = this.data.contracts.find((c) => c.client && c.client.id && String(c.client.name || "").trim().toLowerCase() === key);
    if (hit) return hit.client.id;
    const id = "CLT-MJB-" + String(this.data.clientSeq || 1).padStart(4, "0");
    this.data.clientSeq = (this.data.clientSeq || 1) + 1;
    return id;
  },
  save() { localStorage.setItem(KEY, JSON.stringify(this.data)); }
};
/* Seeded service templates: one engine, many contract types. */
function defaultTemplates() {
  const P = (arr) => arr.map(([name, weeks]) => ({ name, weeks }));
  return [
    { id: "brand-identity", name: "Brand Identity", scope: "Full visual identity system", summary: "", options: "3 initial concepts, 2 revision rounds", deliverables: ["Logo suite (primary + secondary marks)", "Color palette", "Typography system", "Brand guidelines document", "Collateral starters"], phases: P([["Discovery & Research", 1], ["Concept Development", 2], ["Refinement", 1], ["Final Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "logo-design", name: "Logo Design", scope: "Logo mark and lockups", summary: "", options: "3 initial concepts, 2 revision rounds", deliverables: ["Primary logo", "Secondary marks and lockups", "Mini usage guide"], phases: P([["Discovery", 1], ["Concepts", 1], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "web-design", name: "Web Design", scope: "Website design and build", summary: "", options: "2 design directions, 2 revision rounds", deliverables: ["Sitemap and wireframes", "UI design", "Website development", "CMS setup and launch"], phases: P([["Discovery", 1], ["Design", 2], ["Build", 3], ["Launch", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "consulting", name: "Consulting", scope: "Advisory engagement", summary: "", options: "Weekly advisory calls, written recommendations", deliverables: ["Audit report", "Strategy roadmap", "Advisory sessions"], phases: P([["Audit", 1], ["Strategy", 1], ["Advisory", 2]]), depositPct: 100, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "training", name: "Training / Workshop", scope: "Team training delivery", summary: "", options: "Live sessions plus materials and recording", deliverables: ["Curriculum", "Live training sessions", "Materials and recording"], phases: P([["Preparation", 1], ["Delivery", 1], ["Follow-up", 1]]), depositPct: 100, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "webinar-branding", name: "Webinar Branding", scope: "Webinar identity and launch assets", summary: "", options: "2 creative directions, 2 revision rounds", deliverables: ["Webinar title lockup and theme", "Slide deck design", "Promotional flyers and banners", "Social media announcement kit", "Workbook or handout design"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "social-media-templates", name: "Social Media Templates", scope: "Editable social media template system", summary: "", options: "2 style directions, 2 revision rounds, editable source files included", deliverables: ["Feed post templates", "Story and reel cover templates", "Profile and highlight covers", "Caption and hashtag guide"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "wedding-branding", name: "Wedding Branding", scope: "Wedding identity and stationery suite", summary: "", options: "2 creative directions, 2 revision rounds", deliverables: ["Couple monogram and theme", "Invitation suite", "Ceremony programs and signage", "Souvenir and packaging design"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Production handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "presentations", name: "Presentations", scope: "Slide decks and pitch presentations", summary: "", options: "2 style directions, 2 revision rounds, editable source files included", deliverables: ["Slide deck design", "Infographics and charts", "Speaker notes", "Editable master template"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "company-profile", name: "Company Profile", scope: "Company profile documents", summary: "", options: "2 style directions, 2 revision rounds, print-ready and digital versions", deliverables: ["Company profile document", "Infographics and charts", "Print-ready and digital versions"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "digital-illustrations", name: "Digital Illustrations", scope: "Custom illustration sets", summary: "", options: "2 style directions, 2 revision rounds, source files included", deliverables: ["Hero illustrations", "Spot illustrations set", "Icon set", "Source files"], phases: P([["Discovery", 1], ["Design", 2], ["Refinement", 1], ["Handover", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "ads-placement", name: "Ads Placement", scope: "Paid ad placement management", summary: "", options: "Monthly placement report with creative rotation", deliverables: ["Media plan", "Ad setup and launch", "Monitoring and optimization", "Monthly performance report"], phases: P([["Planning", 1], ["Launch", 1], ["Optimization", 2], ["Reporting", 1]]), depositPct: 100, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "digital-marketing", name: "Digital Marketing", scope: "Marketing execution and growth", summary: "", options: "Monthly content calendar and growth report", deliverables: ["Marketing audit", "Content calendar", "Campaign management", "Monthly growth report"], phases: P([["Audit", 1], ["Setup", 1], ["Management", 4], ["Reporting", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } },
    { id: "web-applications", name: "Web Applications / Software", scope: "Web app design and development", summary: "", options: "Milestone demos, 2 revision rounds per milestone", deliverables: ["UX flows and wireframes", "UI design system", "Application development", "Testing and deployment"], phases: P([["Discovery", 1], ["Design", 2], ["Build", 4], ["Launch", 1]]), depositPct: 75, vatPct: 7.5, pay: { m1: "", m2: "" } }
  ];
}
store.load();
const S = store.data;
let route = { view: "dashboard", id: null };
let draft = null;

/* Official studio accounts — constant on every invoice (mirrors mrjamesbrand repo). */
const OFFICIAL = {
  zenith: { bank: "Zenith Bank", name: "MRJAMESBRAND LIMITED", number: "1229578097" },
  kuda: { bank: "Kuda MFB", name: "MRJAMESBRAND LTD", number: "3004035777" },
  finance: "finance@mrjamesbrandltd.com"
};

/* ---------- fixed legal text (from contract template) ---------- */
const T = {
  deposit: "A deposit of 75% or 100% of the quoted fee is required before any work begins; this is standard practice. The balance falls due when the final design is approved, and all digital files are released only after it clears. Full rights in the design transfer on that final payment, not before.",
  secure: "Your slot is booked when the deposit lands, and a receipt follows immediately. This quote is a package price: add or remove items and the pricing of the rest may move, and every figure here holds for 30 days from the document date. On the scope described, this budget is a final price commitment.",
  cancel: "Cancel after concepts have been presented and payments made stay non-refundable, though a fair share can come back depending on work completed. If the designer cannot finish through illness or emergency, you are refunded in full in most cases; completed work is handed over so another designer can continue, with a fair share retained for it.",
  suspend: "You are hiring judgment, not just hands: direction is welcome, but constant second-guessing stalls the very work it means to improve. The designer may pause the project if trust breaks down, if approvals stall after a reasonable number of unique concepts, or if the balance is withheld. Fair warning always comes first. Paused or ended work earns no refund, and every concept stays designer property.",
  fonts: "A finished identity can depend on commercial fonts, and font law applies in full. Any required licence is bought in your name, at your cost, before handover. The designer never passes on their own licensed font files; if you want the same typeface in-house, you purchase your own licence and register it yourself.",
  ip: "Sketches, drafts, working files and every unused concept remain designer property, always. The approved final artwork becomes yours the instant the balance clears. Until then, unpaid ideas may be reworked for others or shown as portfolio pieces, and any use of them without payment will be pursued. Only the signed-off design transfers; everything earlier stays unless agreed in writing. Finished work may be shown as a client case study during and after the project; flag secrecy needs before signing.",
  trademark: "Trademark, copyright and name-availability searches are slow, technical and costly, so they sit outside this contract. If the logo or its assets must be registered, take independent legal advice. The designer cannot usefully help with the process itself.",
  naming: "The name is entirely your responsibility. Confirm it is free and safe before work starts: no one else using it, no clash with a registered mark. A rename halfway through restarts the design clock, forces a re-quote for the rework, and can double the agreed fee."
};

/* ---------- document renderer ---------- */
function docHTML(c, ed) {
  const st = store.data.settings;
  const E = (p, ph) => ed ? ` data-ep="${p}" data-ph="${ph || "Type here"}"` : "";
  const V = (v) => ed ? esc(v) : (esc(v) || "");
  const nl = (v) => esc(v).replace(/\n/g, "<br>");
  const t = totals(c);
  const dvs = c.project.deliverables.filter(Boolean);
  const ph = c.duration.phases;
  const totW = ph.reduce((s, p) => s + (Number(p.weeks) || 0), 0);
  const designer = esc(st.designer), email = esc(st.email);
  return `
  <div class="doc">
    <div class="doc-page">
      <div class="doc-top">
        <div class="doc-kicker">PROJECT PROPOSAL // ${esc(c.client.name || c.client.business || "CLIENT").toUpperCase()}</div></div>
      <h1 class="doc-hero">${esc((c.templateName || c.project.scope || "Design").toUpperCase())}<br>CONTRACT</h1>
      <div class="doc-info"><div class="bar"></div>
        <div>CLIENT NAME</div><div${E("client.name", "CLIENT NAME HERE")}>${V(c.client.name)}</div>
        <div>BUSINESS</div><div${E("client.business", "BUSINESS NAME HERE")}>${V(c.client.business)}</div>
        <div>INDUSTRY</div><div${E("client.industry", "INDUSTRY HERE")}>${V(c.client.industry)}</div>
        <div>PROJECT SCOPE</div><div${E("project.scope", "PROJECT SCOPE HERE")}>${ed ? esc(c.project.scope) : (esc(c.project.scope) || esc(c.project.name) || "")}</div>
        <div>DATE</div><div><span${E("createdAt", "DATE HERE")}>${esc(c.createdAt)}</span> · ${esc(c.ref)}</div></div>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // ${esc(c.client.business) || "BRAND"} // SCOPE AND DELIVERABLES</div>
      <div class="doc-head"><h2>Scope</h2></div>
      <table class="doc-table">
        <tr><th style="width:35%">Project Name</th><td${E("project.name", "Project Name")}>${V(c.project.name)}</td></tr>
        <tr><th>Client Details</th><td>
          <div${E("client.name", "Insert Client Name here")}>${V(c.client.name)}</div>
          <div${E("client.business", "Insert Client Business Name here")}>${V(c.client.business)}</div>
          <div${E("client.email", "Insert Client E-mail Address here")}>${V(c.client.email)}</div>
          <div${E("client.phone", "Insert Client Contact Number here")}>${V(c.client.phone)}</div></td></tr>
        <tr><th>Project Summary</th><td${E("project.summary", "Write brief project summary here.")}>${nl(c.project.summary)}</td></tr>
        <tr><th>Project Deliverables</th><td${E("project.deliverables", "List Deliverable 1 here")}>${dvs.length ? dvs.map((d) => "• " + esc(d)).join("<br>") : ""}</td></tr>
      </table>
      <div class="doc-quote"><span>QUOTE</span><span${E("money.quote", "XXXX" + c.money.currency)}>${money(t.total, c.money.currency)}</span></div>
      <div class="doc-olive"><h4>Deliverables &amp; revisions</h4>
        <p><span${E("project.options", "Options & revisions statement")}>${esc(c.project.options)}</span>. Costs valid 30 days from document date.</p>
        <p>Subtotal: <strong>${money(t.sub, c.money.currency)}</strong><br>Plus VAT (<span${E("money.vatPct", "7.5")}>${t.pct}</span>%): <strong>${money(t.vat, c.money.currency)}</strong></p>
        <h4>Payment Breakdown: <span${E("money.depositPct", "75")}>${c.money.depositPct}</span>% deposit, ${100 - c.money.depositPct}% before file delivery</h4>
        <p>Deposit (to start work): <strong>${money(t.dep, c.money.currency)}</strong><br>Balance (before files transfer): <strong>${money(t.bal, c.money.currency)}</strong></p></div>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // PAYMENT TERMS</div>
      <div class="doc-head"><h2>Payment Terms</h2></div>
      <h4>Deposit and Final Payment</h4><p>${T.deposit}</p>
      <div class="doc-beige"><h4>Payment Required to Secure Project</h4><p>${T.secure}</p></div>
      <h4>Payment Methods</h4><p>Preferred: ${ed ? (esc(c.pay.m1) || "") : (esc(c.pay.m1) || esc(st.wm1))}. ${ed ? (esc(c.pay.m2) || "") : (esc(c.pay.m2) || esc(st.wm2))}. Alternatives welcome.</p>
      <div class="doc-olive"><h4>Method One</h4><p${E("pay.m1", "Insert Details Here")}>${ed ? nl(c.pay.m1) : (esc(c.pay.m1) ? nl(c.pay.m1) : esc(st.wm1))}</p><h4>Method Two</h4><p${E("pay.m2", "Insert Details Here")}>${ed ? nl(c.pay.m2) : (esc(c.pay.m2) ? nl(c.pay.m2) : esc(st.wm2))}</p></div>
      <h4>Problems With Paying?</h4><p>As this is an investment, kindly flag any difficulty processing payment: an amicable solution will be found.</p>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // PROJECT DURATION</div>
      <div class="doc-head"><h2>Project Duration</h2></div>
      <h4>Estimated Project Duration</h4><p>Timelines assume feedback and approvals within 24 to 48 hours of delivery milestones.</p>
      <table class="doc-table"><tr><th>Phase</th><th>Duration</th></tr>
        ${ph.map((p, i) => `<tr><td${ed ? ` data-epn="${i}" data-ph="Phase 0${i + 1} name"` : ""}>${ed ? esc(p.name) : (esc(p.name) || "")}</td><td${ed ? ` data-epw="${i}"` : ""}>${esc(String(p.weeks))} Weeks</td></tr>`).join("")}
      </table>
      <div class="doc-olive"><h4>Total Estimated Timeline: ${totW} Weeks (initial presentation)</h4></div>
      <div class="doc-beige"><h4>Expected Project Handover</h4><p>Every job needs real research days before a concept exists and real build days after one is chosen. Treat first sketch to final files as one unbroken timeline of dedicated days and weeks; availability, scope changes and revision rounds can move it. Nothing hurries research without thinning the idea.</p></div>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // PROJECT TERMS</div>
      <div class="doc-head"><h2>Project Terms</h2></div>
      <h4>Cancellation During The Project</h4><p>${T.cancel}</p>
      <div class="doc-beige"><h4>Project Suspension</h4><p>${T.suspend}</p></div>
      <h4>Font and Typeface Licensing</h4><p>${T.fonts}</p>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // OWNERSHIP AND COPYRIGHT</div>
      <div class="doc-head"><h2>Ownership, Copyright, Trademarks &amp; Legal</h2></div>
      <div class="doc-beige"><h4>Ownership &amp; Intellectual Property</h4><p>${T.ip}</p></div>
      <div class="doc-beige"><h4>Trademark &amp; Copyright</h4><p>${T.trademark}</p></div>
      <div class="doc-beige"><h4>Brand Naming</h4><p>${T.naming}</p></div>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
    <div class="doc-page">
      <div class="doc-sec-kicker">// PROJECT PROPOSAL // THE BIG SIGN OFF</div>
      <div class="doc-head"><h2>The Big Sign Off, Yay!</h2></div>
      <h4>Just for transparency…</h4>
      <p>If the direction feels wrong at any point, say so early, preferably on a call rather than email. The goal is the strongest creative outcome, reached together, and that needs objectives both sides fully share. Raise doubts now, before work starts.</p>
      <p>When ready, sign below and return the document to ${email}, then arrange the deposit so the project is booked in. Until it lands, other work may take the slot. Thank you for trusting the studio with this project.</p>
      <div class="doc-beige"><h4>Let's Create! Signing accepts all terms in this proposal.</h4>
        <div class="sig-grid">
          <div class="sigbox"><label class="f">Designer Signature: ${designer}</label>
            ${c.sign.designerSig ? `<img src="${c.sign.designerSig}" alt="designer signature">` : "<p>Not signed yet</p>"}</div>
          <div class="sigbox"><label class="f">Client Signature: ${esc(c.sign.clientName) || esc(c.client.name)}</label>
            ${c.sign.clientSig ? `<img src="${c.sign.clientSig}" alt="client signature">` : "<p>Not signed yet</p>"}</div>
        </div>
        <dl class="sig-meta">
          <dt>Full Name</dt><dd${E("sign.clientName", "Full Name")}>${V(c.sign.clientName)}</dd>
          <dt>Company</dt><dd${E("client.business", "Company Name")}>${V(c.client.business)}</dd>
          <dt>Date</dt><dd${E("sign.date", "Date")}>${V(c.sign.date)}</dd>
          <dt>Payment Method</dt><dd${E("sign.paymentMethod", "Payment Method")}>${V(c.sign.paymentMethod)}</dd>
          <dt>Date Paid</dt><dd${E("sign.paymentDate", "Date Payment Made")}>${V(c.sign.paymentDate)}</dd>
          <dt>Comments</dt><dd${E("sign.comments", "Additional Comments")}>${V(c.sign.comments)}</dd>
        </dl></div>
      <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
    </div>
  </div>`;
}

function invoiceHTML(inv) {
  const c = S.contracts.find((x) => x.id === inv.contractId) || {};
  const sum = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  const hasVat = inv.subtotal !== undefined;
  const vSub = hasVat ? inv.subtotal : sum, vVat = hasVat ? inv.vat : 0;
  return `<div class="doc"><div class="doc-page">
    <div class="inv-head"><div class="inv-brand">${S.settings.logo ? `<img class="inv-logo" src="${S.settings.logo}" alt="studio logo">` : `<span class="inv-mark">MJB</span>`}
      <span><strong>MRJAMESBRAND LTD</strong><br>${esc(S.settings.email)}</span></div>
      <div style="text-align:right"><h2 style="font-size:2.2rem">INVOICE</h2><p>${esc(inv.ref)} · ${esc(inv.createdAt)}</p>
      <span class="badge b-${inv.status.toLowerCase()}">${inv.status}</span></div></div>
    <div class="grid2"><div><h4>Bill To</h4><p>${esc(inv.clientName)}<br>${esc(inv.clientEmail)}${inv.clientId ? `<br>Client ID: ${esc(inv.clientId)}` : ""}</p></div>
      <div><h4>Contract</h4><p>${esc(c.ref || "")} · ${esc((c.project || {}).name || "")}<br>Due: ${esc(inv.dueAt || "")}</p></div></div>
    <table class="doc-table mt"><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
      ${inv.items.map((i) => `<tr><td><strong>${esc(i.name)}</strong><br>${esc(i.desc || "")}</td><td>${i.qty}</td><td>${money(i.price, inv.currency)}</td><td>${money(i.qty * i.price, inv.currency)}</td></tr>`).join("")}
    </table>
    ${hasVat ? `<p style="text-align:right">Subtotal: ${money(vSub, inv.currency)}<br>${inv.disc > 0 ? `Discount (${inv.discPct}%): −${money(inv.disc, inv.currency)}<br>` : ""}VAT (${inv.vatPct}%): ${money(vVat, inv.currency)}</p>` : ""}
    <div class="inv-total"><span>TOTAL</span><span>${money(invTotal(inv), inv.currency)}</span></div>
    ${inv.notes ? `<p class="mt"><strong>Notes:</strong> ${esc(inv.notes)}</p>` : ""}
    <div class="doc-beige"><h4>Pay To: Official Studio Accounts</h4>
      <table class="doc-table"><tr><th>Bank</th><th>Account Name</th><th>Account Number</th></tr>
        <tr><td>${OFFICIAL.zenith.bank}</td><td>${OFFICIAL.zenith.name}</td><td>${OFFICIAL.zenith.number}</td></tr>
        <tr><td>${OFFICIAL.kuda.bank}</td><td>${OFFICIAL.kuda.name}</td><td>${OFFICIAL.kuda.number}</td></tr></table>
      <p>Use ${esc(inv.ref)} as payment narration. Send proof of payment to ${OFFICIAL.finance}.</p></div>
    <p class="mt">Pay to secure / release files per contract terms. Send proof of payment to ${esc(S.settings.email)}.</p>
    <div class="doc-foot"><span>MRJAMESBRAND LTD</span></div>
  </div></div>`;
}

/* ---------- views ---------- */
function badge(s) { return `<span class="badge b-${s.toLowerCase()}">${s}</span>`; }
/* Invoice status display: part-paid invoices read PART until both halves land. */
function invBadge(i) {
  if (i.status === "SENT" && (i.depPaid || i.balPaid)) return `<span class="badge b-part">PART</span>`;
  return badge(i.status);
}
/* Days of quote validity left (30-day terms). Negative = expired. */
function validityDays(c) {
  const d = new Date(c.createdAt).getTime();
  if (isNaN(d)) return 30;
  return 30 - Math.floor((Date.now() - d) / 864e5);
}
function validityBadge(c) {
  const n = validityDays(c);
  if (c.status === "SIGNED") return `<span class="badge b-signed">SIGNED</span>`;
  if (n < 0) return `<span class="badge b-overdue">EXPIRED</span>`;
  if (n <= 7) return `<span class="badge b-cancelled">${n}D LEFT</span>`;
  return `<span class="badge b-draft">${n}D LEFT</span>`;
}
function nav() { $$(".navlink").forEach((b) => b.classList.toggle("active", b.dataset.view === route.view)); }

function vDashboard() {
  const cs = S.contracts, inv = S.invoices;
  const signed = cs.filter((c) => c.status === "SIGNED").length;
  const owed = inv.filter((i) => i.status !== "PAID").reduce((s, i) => s + invTotal(i), 0);
  return `<div id="glow" class="no-print" aria-hidden="true"></div>
    <p class="eyebrow">Contract Studio</p>
    <h1 class="page-title">Prepare &amp; <span class="hl">sign contracts.</span></h1>
    <p class="lede">Generate design contracts, get them signed, and raise invoices. All in the MRJAMESBRAND style.</p>
    <div class="grid3">
      <div class="card"><p class="eyebrow">Contracts</p><h2 style="font-size:2rem">${cs.length}</h2><p>${signed} signed</p></div>
      <div class="card"><p class="eyebrow">Invoices</p><h2 style="font-size:2rem">${inv.length}</h2><p>${money(owed, "USD")} outstanding</p></div>
      <div class="card"><p class="eyebrow">Create</p><h2 style="font-size:1.2rem">New contract</h2>
        <p class="mt"><button class="btn btn-lime" data-act="new">+ New Contract</button></p></div>
    </div>
    <h3 class="mt" style="margin:24px 0 12px">Recent contracts</h3>
    ${contractTable(cs.slice(-5).reverse())}`;
}

function contractTable(cs) {
  if (!cs.length) return `<div class="card empty">No contracts yet. <button class="btn btn-primary" data-act="new">Create the first one</button></div>`;
  return `<div class="card" style="padding:0;overflow:auto"><table class="list">
    <tr><th>Reference</th><th>Client</th><th>Project</th><th>Quote</th><th>Status</th><th>Valid</th><th></th></tr>
    ${cs.map((c) => `<tr><td><strong>${esc(c.ref)}</strong></td><td>${esc(c.client.name) || ""}</td>
      <td>${esc(c.project.name) || ""}</td><td class="money">${money(c.money.quote, c.money.currency)}</td>
      <td>${badge(c.status)}</td><td>${validityBadge(c)}</td>
      <td><div class="rowactions"><button data-act="open" data-id="${c.id}">Open</button><button data-act="clone" data-id="${c.id}">Clone</button><button data-act="del" data-id="${c.id}" style="color:var(--error)">Delete</button></div></td></tr>`).join("")}
  </table></div>`;
}

function vContracts() {
  return `<p class="eyebrow">Admin</p><h1 class="page-title">All <span class="hl">contracts</span></h1>
    <div class="toolbar"><span class="spacer"></span><button class="btn btn-primary" data-act="new">+ New Contract</button></div>
    ${contractTable(S.contracts.slice().reverse())}`;
}

function vClients() {
  const map = {};
  const key = (name) => "n:" + String(name || "").trim().toLowerCase();
  /* explicit records first, so clients with no paperwork yet still list */
  S.clients.forEach((r) => {
    const k = r.id || key(r.name);
    map[k] = { id: r.id || "", name: r.name || "", business: r.business || "", n: 0, inv: 0, billed: 0, owed: 0, cur: "", multi: false };
  });
  S.contracts.forEach((c) => {
    const k = c.client.id || key(c.client.name);
    const r = (map[k] = map[k] || { id: c.client.id || "", name: c.client.name || "", business: "", n: 0, inv: 0, billed: 0, owed: 0, cur: "", multi: false });
    r.n++; if (!r.business && c.client.business) r.business = c.client.business;
  });
  S.invoices.forEach((i) => {
    const c = i.contractId ? S.contracts.find((x) => x.id === i.contractId) : null;
    const k = (c && c.client.id) || (c && key(c.client.name)) || i.clientId || key(i.clientName);
    const r = (map[k] = map[k] || { id: i.clientId || "", name: i.clientName || "", business: (c && c.client.business) || "", n: 0, inv: 0, billed: 0, owed: 0, cur: "", multi: false });
    r.inv++;
    if (!r.cur) r.cur = i.currency; else if (r.cur !== i.currency) r.multi = true;
    r.billed += invTotal(i);
    if (i.status !== "PAID") r.owed += invTotal(i);
  });
  const rows = Object.values(map).sort((a, b) => b.billed - a.billed);
  const fmt = (r, v) => r.multi ? `${money(v, r.cur || "USD")}*` : money(v, r.cur || "USD");
  return `<p class="eyebrow">Admin</p><h1 class="page-title">All <span class="hl">clients</span></h1>
    <div class="toolbar"><span class="spacer"></span><button class="btn btn-primary" data-act="new-client">+ New client</button></div>
    ${rows.length ? `<div class="card" style="padding:0;overflow:auto"><table class="list">
      <tr><th>Client ID</th><th>Name</th><th>Contracts</th><th>Invoices</th><th>Billed</th><th>Owed</th><th></th></tr>
      ${rows.map((r) => `<tr><td><strong>${esc(r.id) || "—"}</strong></td><td>${esc(r.name)}${r.business ? `<br><span style="color:var(--stone);font-size:.8rem">${esc(r.business)}</span>` : ""}</td>
        <td>${r.n}</td><td>${r.inv}</td><td class="money">${fmt(r, r.billed)}</td><td class="money">${fmt(r, r.owed)}</td>
        <td><div class="rowactions"><button data-act="edit-client" data-id="${esc(r.id || "n:" + r.name)}">Edit</button><button data-act="del-client" data-id="${esc(r.id || "n:" + r.name)}" style="color:var(--error)">Delete</button></div></td></tr>`).join("")}
    </table></div><p style="font-size:.8rem;color:var(--stone)">${rows.some((r) => r.multi) ? "* Mixed currencies summed by figure." : ""}</p>` : `<div class="card empty">No clients yet — they appear here once you save a contract, or <button class="btn btn-primary" data-act="new-client">add one</button>.</div>`}`;
}

let draftClient = null;
function vClientEdit() {
  const d = draftClient;
  return `<p class="eyebrow">Admin · client ${esc(d.id) || "(new)"}</p>
    <h1 class="page-title">${d._isNew ? "New" : "Edit"} <span class="hl">client</span></h1>
    <div class="toolbar no-print">
      <button class="btn btn-primary" data-act="save-client">Save client</button>
      <button class="btn btn-ghost" data-act="cancel-client">Cancel</button>
    </div><div id="err"></div>
    <div class="card no-print" style="max-width:640px"><div class="formgrid">
      <label class="f">Full name*<input data-cf="name" value="${esc(d.name)}"></label>
      <label class="f">Business<input data-cf="business" value="${esc(d.business)}"></label>
      <label class="f">Email<input data-cf="email" value="${esc(d.email)}"></label>
      <label class="f">Phone<input data-cf="phone" value="${esc(d.phone)}"></label>
      ${d.id ? `<label class="f">Client ID<input value="${esc(d.id)}" disabled></label>` : ""}
    </div>
    <p class="mt" style="font-size:.85rem;color:var(--stone)">Saving updates this client everywhere: their record plus all matching contracts and invoices.</p></div>`;
}

function vPicker() {  return `<p class="eyebrow">New contract</p><h1 class="page-title">Pick a <span class="hl">service</span></h1>
    <p class="lede">Each service prefills deliverables, phases, deposit and VAT. Same engine, any offering.</p>
    <div class="grid3">
      ${S.templates.map((t) => `<button class="card" style="text-align:left;cursor:pointer" data-act="from-tpl" data-id="${t.id}">
        <p class="eyebrow">${t.depositPct}% deposit · ${t.vatPct}% VAT</p>
        <h3 class="mt">${esc(t.name)}</h3>
        <p style="font-size:.85rem;color:var(--stone)">${t.deliverables.length} deliverables · ${t.phases.length} phases</p>
      </button>`).join("")}
      <button class="card" style="text-align:left;cursor:pointer" data-act="from-blank">
        <p class="eyebrow">Custom</p><h3 class="mt">Blank contract</h3>
        <p style="font-size:.85rem;color:var(--stone)">Start from scratch</p>
      </button>
    </div>`;
}

function vEditor() {
  const c = draft, t = totals(c);
  return `<p class="eyebrow">Admin · ${esc(c.ref)} ${badge(c.status)}${c.templateName ? ` · ${esc(c.templateName)}` : ""}</p>
    <h1 class="page-title">${c.id && S.contracts.find((x) => x.id === c.id) ? "Edit" : "New"} <span class="hl">contract</span></h1>
    <div class="toolbar no-print">
      <button class="btn btn-primary" data-act="save">Save</button>
      <button class="btn btn-ghost" data-act="send" ${c.status !== "DRAFT" ? "disabled" : ""}>Mark Sent</button>
      <button class="btn btn-ghost" data-act="preview">Preview &amp; Sign →</button>
      <button class="btn btn-ghost" data-act="save-tpl">Save as template</button>
      <span class="spacer"></span><button class="btn" onclick="window.print()">Print / PDF</button>
    </div><p class="no-print" style="font-size:.8rem;color:var(--stone)">Tip: click any value inside the preview: every row and column edits inline.</p><div id="err"></div>
    <div class="editor"><div class="panel card no-print">
      <h3>Client</h3><div class="formgrid">
        <label class="f">Client name*<input data-f="client.name" value="${esc(c.client.name)}"></label>
        <label class="f">Business<input data-f="client.business" value="${esc(c.client.business)}"></label>
        <label class="f">Industry<input data-f="client.industry" value="${esc(c.client.industry)}"></label>
        <label class="f">Email<input data-f="client.email" value="${esc(c.client.email)}"></label>
        <label class="f">Phone<input data-f="client.phone" value="${esc(c.client.phone)}"></label>
        <label class="f">Date<input type="date" data-f="createdAt" value="${esc(c.createdAt)}"></label>
      </div>
      <h3 class="mt">Project</h3><div class="formgrid">
        <label class="f full">Project name*<input data-f="project.name" value="${esc(c.project.name)}"></label>
        <label class="f full">Scope<input data-f="project.scope" value="${esc(c.project.scope)}"></label>
        <label class="f full">Summary<textarea data-f="project.summary">${esc(c.project.summary)}</textarea></label>
        <label class="f full">Options &amp; revisions<input data-f="project.options" value="${esc(c.project.options)}"></label>
      </div>
      <h3 class="mt">Deliverables</h3><div id="dlist">
        ${c.project.deliverables.map((d, i) => `<div class="deliverable-row"><input data-d="${i}" value="${esc(d)}" placeholder="Deliverable ${i + 1}"><button data-act="del-d" data-i="${i}">×</button></div>`).join("")}
      </div><button class="btn btn-ghost" data-act="add-d">+ Add deliverable</button>
      <h3 class="mt">Money</h3><div class="formgrid">
        <label class="f">Currency<select data-f="money.currency"><option ${c.money.currency === "USD" ? "selected" : ""}>USD</option><option ${c.money.currency === "NGN" ? "selected" : ""}>NGN</option></select></label>
        <label class="f">Quote (before VAT)<input type="number" min="0" data-f="money.quote" value="${c.money.quote}"></label>
        <label class="f">VAT %<input type="number" min="0" max="100" step="0.5" data-f="money.vatPct" value="${t.pct}"></label>
        <label class="f">Deposit<select data-f="money.depositPct">${[75, 100].includes(Number(c.money.depositPct)) ? "" : `<option value="${c.money.depositPct}" selected>${c.money.depositPct}% (legacy)</option>`}<option value="75"${Number(c.money.depositPct) === 75 ? " selected" : ""}>75%</option><option value="100"${Number(c.money.depositPct) === 100 ? " selected" : ""}>100%</option></select></label>
        <label class="f">Total (incl. VAT)<input id="totalfield" value="${money(t.total, c.money.currency)}" disabled></label>
        <label class="f">Balance<input id="balfield" value="${money(t.bal, c.money.currency)}" disabled></label>
      </div>
      <h3 class="mt">Payment methods</h3><div class="formgrid">
        <label class="f full">Method one<textarea data-f="pay.m1">${esc(c.pay.m1)}</textarea></label>
        <label class="f full">Method two<textarea data-f="pay.m2">${esc(c.pay.m2)}</textarea></label>
      </div>
      <h3 class="mt">Phases</h3><div id="plist">
        ${c.duration.phases.map((p, i) => `<div class="deliverable-row"><input data-pn="${i}" value="${esc(p.name)}" style="flex:3"><input type="number" min="0" data-pw="${i}" value="${p.weeks}" style="flex:1"><button data-act="del-p" data-i="${i}">×</button></div>`).join("")}
      </div><button class="btn btn-ghost" data-act="add-p">+ Add phase</button>
    </div><div id="preview">${docHTML(c, true)}</div></div>`;
}

function vDocument(id) {
  const c = S.contracts.find((x) => x.id === id);
  if (!c) return `<div class="card empty">Not found.</div>`;
  const invs = S.invoices.filter((i) => i.contractId === id);
  const next = { DRAFT: ["SENT"], SENT: ["SIGNED"], SIGNED: [], CANCELLED: [] }[c.status] || [];
  return `<p class="eyebrow">Contract · ${esc(c.ref)} ${badge(c.status)}</p>
    <h1 class="page-title">${esc(c.project.name) || "Contract"}</h1>
    <div class="toolbar no-print">
      ${next.map((s) => `<button class="btn ${s === "SIGNED" ? "btn-lime" : "btn-primary"}" data-act="status" data-id="${c.id}" data-s="${s}">Mark ${s}</button>`).join("")}
      ${c.status === "SIGNED" ? `<button class="btn btn-primary" data-act="invoice" data-id="${c.id}">+ Raise invoice</button>` : ""}
      <button class="btn btn-ghost" data-act="edit" data-id="${c.id}">Edit</button>
      <button class="btn btn-ghost" data-act="clone" data-id="${c.id}">Clone</button>
      <button class="btn btn-ghost" data-act="share" data-id="${c.id}">Share for signing</button>
      <button class="btn btn-ghost" data-act="apply-code">Apply client code</button>
      <span class="spacer"></span><button class="btn" onclick="window.print()">Print / PDF</button>
    </div>
    ${c.status !== "SIGNED" ? `<div class="card no-print"><h3>Sign off</h3>
      <div class="formgrid mt">
        <label class="f">Client full name<input id="sg-name" value="${esc(c.sign.clientName || c.client.name)}"></label>
        <label class="f">Date<input type="date" id="sg-date" value="${esc(c.sign.date) || todayISO()}"></label>
        <label class="f">Payment method<input id="sg-pay" value="${esc(c.sign.paymentMethod)}"></label>
        <label class="f">Date paid<input type="date" id="sg-paydate" value="${esc(c.sign.paymentDate)}"></label>
      </div>
      <div class="sig-grid mt"><div class="sigbox"><label class="f">Designer: ${esc(S.settings.designer)}</label><canvas id="pad-d"></canvas>
        <p><button class="btn btn-ghost" data-act="clear-d">Clear</button> <button class="btn btn-primary" data-act="sign-d" data-id="${c.id}">Sign as designer</button></p></div>
        <div class="sigbox"><label class="f">Client</label><canvas id="pad-c"></canvas>
        <p><button class="btn btn-ghost" data-act="clear-c">Clear</button> <button class="btn btn-lime" data-act="sign-c" data-id="${c.id}">Sign as client</button></p></div></div>
      <label class="f mt">Comments<textarea id="sg-comments">${esc(c.sign.comments)}</textarea></label>
    </div>` : ""}
    ${invs.length ? `<h3 style="margin:20px 0 10px">Invoices</h3>${invs.map((i) => `<p><button class="btn btn-ghost" data-act="open-inv" data-id="${i.id}">${esc(i.ref)} · ${i.status} · ${money(invTotal(i), i.currency)}</button></p>`).join("")}` : ""}
    <div class="mt">${docHTML(c)}</div>`;
}

function vInvoices() {
  const inv = S.invoices.slice().reverse();
  return `<p class="eyebrow">Admin</p><h1 class="page-title">All <span class="hl">invoices</span></h1>
    <div class="toolbar"><span class="spacer"></span><button class="btn btn-primary" data-act="new-inv">+ New invoice</button></div>
    ${inv.length ? `<div class="card" style="padding:0;overflow:auto"><table class="list">
      <tr><th>Reference</th><th>Client</th><th>Amount</th><th>Status</th><th>Due</th><th></th></tr>
      ${inv.map((i) => `<tr><td><strong>${esc(i.ref)}</strong></td><td>${esc(i.clientName)}</td>
        <td class="money">${money(invTotal(i), i.currency)}</td>
        <td>${invBadge(i)}</td><td>${esc(i.dueAt || "")}</td>
        <td><div class="rowactions"><button data-act="open-inv" data-id="${i.id}">Open</button></div></td></tr>`).join("")}
    </table></div>` : `<div class="card empty">No invoices yet. Sign a contract first, then raise one.</div>`}`;
}

function vInvoice(id) {
  const i = S.invoices.find((x) => x.id === id);
  if (!i) return `<div class="card empty">Not found.</div>`;
  return `<p class="eyebrow">Invoice · ${esc(i.ref)} ${invBadge(i)}</p>
    <div class="toolbar no-print">
      ${i.status !== "PAID" ? `<button class="btn btn-lime" data-act="paid" data-id="${i.id}">Mark PAID</button>` : ""}
      <span class="spacer"></span><button class="btn" onclick="window.print()">Print / PDF</button>
    </div>
    <div class="card no-print" style="max-width:640px;margin-bottom:16px"><h3>Payments received</h3>
      <div class="formgrid">
        <label class="f">Deposit<span style="display:flex;align-items:center;gap:10px;margin-top:6px;font-size:.9rem;font-weight:400;text-transform:none;letter-spacing:normal"><input type="checkbox" data-pay="depPaid"${i.depPaid ? " checked" : ""} style="width:22px;height:22px">${i.depPaid ? "Received" : "Awaiting"}</span></label>
        <label class="f">Balance<span style="display:flex;align-items:center;gap:10px;margin-top:6px;font-size:.9rem;font-weight:400;text-transform:none;letter-spacing:normal"><input type="checkbox" data-pay="balPaid"${i.balPaid ? " checked" : ""} style="width:22px;height:22px">${i.balPaid ? "Received" : "Awaiting"}</span></label>
      </div></div>${invoiceHTML(i)}`;
}

/* ---------- standalone invoice builder ---------- */
let draftInv = null;
function blankInv() {
  return { clientName: "", clientEmail: "", currency: "USD", vatPct: 7.5, discPct: 0,
    dueAt: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    notes: "", contractId: "", items: [{ name: "", desc: "", qty: 1, price: 0 }] };
}
function invTotals(d) {
  const sub = d.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const dpct = Number(d.discPct) || 0, disc = Math.round(sub * dpct / 100);
  const nsub = sub - disc;
  const pct = Number(d.vatPct) || 0, vat = Math.round(nsub * pct / 100);
  return { sub, pct, vat, total: nsub + vat, disc, dpct };
}
function invTotal(i) {
  const s = i.items.reduce((a, l) => a + l.qty * l.price, 0);
  const sub = i.subtotal !== undefined ? i.subtotal : s;
  return sub - (i.disc || 0) + (i.vat || 0);
}
function invTotalsHTML(d) {
  const t = invTotals(d);
  const row = "display:flex;justify-content:space-between;gap:16px;padding:6px 0;font-size:.9rem;";
  return `<div style="${row}"><span>Subtotal</span><span class="money">${money(t.sub, d.currency)}</span></div>
    ${t.dpct > 0 ? `<div style="${row}"><span>Discount (${t.dpct}%)</span><span class="money">−${money(t.disc, d.currency)}</span></div>` : ""}
    <div style="${row}"><span>VAT (${t.pct}%)</span><span class="money">${money(t.vat, d.currency)}</span></div>
    <div class="money" style="display:flex;justify-content:space-between;gap:16px;font-size:1.2rem;border-top:2px solid #000;padding-top:10px;margin-top:6px"><span>Total</span><span>${money(t.total, d.currency)}</span></div>`;
}
function vInvEditor() {
  const d = draftInv;
  return `<p class="eyebrow">Admin · new invoice ${d.contractId ? "(linked)" : "(standalone)"}</p>
    <h1 class="page-title">New <span class="hl">invoice</span></h1>
    <div class="toolbar no-print">
      <button class="btn btn-primary" data-act="save-inv">Save invoice</button>
      <button class="btn btn-ghost" data-act="cancel-inv">Cancel</button>
    </div><div id="err"></div>
    <div class="card no-print" style="max-width:760px">
      <h3>Bill To</h3><div class="formgrid">
        <label class="f">Client name*<input data-if="clientName" value="${esc(d.clientName)}"></label>
        <label class="f">Client email<input data-if="clientEmail" value="${esc(d.clientEmail)}"></label>
        <label class="f">Currency<select data-if="currency"><option${d.currency === "USD" ? " selected" : ""}>USD</option><option${d.currency === "NGN" ? " selected" : ""}>NGN</option></select></label>
        <label class="f">VAT %<input type="number" min="0" max="100" step="0.5" data-if="vatPct" value="${d.vatPct}"></label>
        <label class="f">Discount %<input type="number" min="0" max="100" step="0.5" data-if="discPct" value="${d.discPct}"></label>
        <label class="f">Due date<input type="date" data-if="dueAt" value="${esc(d.dueAt)}"></label>
        <label class="f">Link contract (optional)<select data-if="contractId"><option value="">Standalone (no contract)</option>
          ${S.contracts.map((c) => `<option value="${c.id}"${d.contractId === c.id ? " selected" : ""}>${esc(c.ref)} · ${esc(c.project.name)}</option>`).join("")}</select></label>
        <label class="f full">Notes<textarea data-if="notes">${esc(d.notes)}</textarea></label>
      </div>
      <h3 class="mt">Services <span style="font-weight:400;font-size:.8rem;color:var(--stone)">name, description and cost per line</span></h3>
      <div id="iilist">
        ${d.items.map((it, i) => `<div class="ii-row">
          <input data-ii="${i}:name" value="${esc(it.name)}" placeholder="Service">
          <input data-ii="${i}:desc" value="${esc(it.desc)}" placeholder="Description">
          <input type="number" min="1" data-ii="${i}:qty" value="${it.qty}" aria-label="Quantity">
          <input type="number" min="0" data-ii="${i}:price" value="${it.price}" aria-label="Price">
          <button data-act="del-ii" data-i="${i}" aria-label="Remove line">×</button></div>`).join("")}
      </div>
      <p class="mt"><button class="btn btn-ghost" data-act="add-ii">+ Add line</button></p>
      <div class="mt" id="invtotals" style="max-width:320px;margin-left:auto">${invTotalsHTML(d)}</div>
    </div>`;
}
function refreshInvTotals() { const t = $("#invtotals"); if (t && draftInv) t.innerHTML = invTotalsHTML(draftInv); }
function persistInv() {
  const d = draftInv;
  if (!d.clientName) { const er = $("#err"); if (er) er.innerHTML = `<div class="alert">Client name is required.</div>`; window.scrollTo(0, 0); return false; }
  const lines = d.items.filter((i) => i.name && Number(i.price) > 0);
  if (!lines.length) { const er = $("#err"); if (er) er.innerHTML = `<div class="alert">Add at least one service line with a cost above zero.</div>`; return false; }
  const t = invTotals({ ...d, items: lines });
  const linked = d.contractId ? S.contracts.find((x) => x.id === d.contractId) : null;
  const inv = { id: uid(), ref: "INV-MJB-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000)),
    contractId: d.contractId || null, status: "SENT", currency: d.currency, createdAt: todayISO(), dueAt: d.dueAt || null,
    clientName: d.clientName, clientEmail: d.clientEmail, notes: d.notes,
    clientId: (linked && linked.client.id) || store.clientIdFor(d.clientName),
    depPaid: false, balPaid: false,
    subtotal: t.sub, vat: t.vat, vatPct: t.pct, disc: t.disc, discPct: t.dpct,
    items: lines.map((i) => ({ name: i.name, desc: i.desc, qty: Number(i.qty) || 1, price: Number(i.price) || 0 })) };
  S.invoices.push(inv); store.save();
  route = { view: "invoice", id: inv.id }; render(); toast("Invoice created.");
  return true;
}

function vSettings() {
  const s = S.settings;
  return `<p class="eyebrow">Admin</p><h1 class="page-title">Studio <span class="hl">settings</span></h1>
    <div class="card no-print" style="max-width:640px"><div class="formgrid">
      <label class="f">Designer / studio name<input id="set-designer" value="${esc(s.designer)}"></label>
      <label class="f">Contact email<input id="set-email" value="${esc(s.email)}"></label>
      <label class="f full">Social handles<input id="set-social" value="${esc(s.social)}"></label>
      <label class="f full">Default method one<textarea id="set-wm1">${esc(s.wm1)}</textarea></label>
      <label class="f full">Default method two<textarea id="set-wm2">${esc(s.wm2)}</textarea></label>
    </div><p class="mt"><button class="btn btn-primary" data-act="save-settings">Save settings</button></p></div>
    <div class="card no-print mt" style="max-width:640px"><h3>Service templates</h3>
      ${S.templates.map((t) => `<p style="display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--mist);padding:8px 0">
        <span><strong>${esc(t.name)}</strong> <span style="color:var(--stone);font-size:.8rem">${t.depositPct}% deposit · ${t.deliverables.length} deliverables</span></span>
        <button class="btn btn-ghost" data-act="del-tpl" data-id="${t.id}">Delete</button></p>`).join("")}</div>
    <div class="card no-print mt" style="max-width:640px"><h3>Studio logo</h3>
      <p style="font-size:.85rem;color:var(--stone)">Shows on invoices (contracts stay logo-free). PNG or JPG, resized automatically.</p>
      <p class="mt">${S.settings.logo ? `<img src="${S.settings.logo}" alt="studio logo" style="max-height:72px;max-width:220px;background:#fff;border:1px solid var(--mist);padding:6px">` : `<span style="font-size:.85rem;color:var(--stone)">No logo yet — initials print instead.</span>`}</p>
      <p class="mt"><button class="btn btn-ghost" data-act="logo-pick">Upload logo</button>
      ${S.settings.logo ? `<button class="btn btn-danger" data-act="logo-clear">Remove</button>` : ""}
      <input type="file" id="logo-file" accept="image/png,image/jpeg" style="display:none"></p></div>
    <div class="card no-print mt" style="max-width:640px"><h3>Official Accounts (locked)</h3>
      <p style="font-size:.85rem;color:var(--stone)">Printed on every invoice, identical each time. Matches the mrjamesbrand repo.</p>
      <table class="list mt"><tr><th>Bank</th><th>Name</th><th>Number</th></tr>
        <tr><td>${OFFICIAL.zenith.bank}</td><td>${OFFICIAL.zenith.name}</td><td class="money">${OFFICIAL.zenith.number}</td></tr>
        <tr><td>${OFFICIAL.kuda.bank}</td><td>${OFFICIAL.kuda.name}</td><td class="money">${OFFICIAL.kuda.number}</td></tr></table></div>
    <div class="card no-print mt" style="max-width:640px"><h3>Backup</h3>
      <p style="font-size:.85rem;color:var(--stone)">All contracts, invoices and settings live in this browser. Download a backup copy regularly.</p>
      <p class="mt"><button class="btn btn-ghost" data-act="backup">Download backup</button>
      <button class="btn btn-ghost" data-act="restore">Restore backup</button>
      <input type="file" id="restore-file" accept="application/json" style="display:none"></p></div>
    <div class="card no-print mt" style="max-width:640px"><h3>Admin login ${S.settings.lockHash ? "(on)" : "(off)"}</h3>
      <p style="font-size:.85rem;color:var(--stone)">Password-gate this studio on shared devices. Stored as a hash, never plain text.</p>
      <div class="formgrid mt">
        <label class="f">Username<input id="set-adminuser" value="${esc(S.settings.adminUser || "")}" autocomplete="username"></label>
        <span></span>
        <label class="f">New password<input id="set-pass" type="password" autocomplete="new-password"></label>
        <label class="f">Confirm<input id="set-pass2" type="password" autocomplete="new-password"></label>
      </div>
      <p class="mt"><button class="btn btn-primary" data-act="save-lock">Set password</button>
      ${S.settings.lockHash ? `<button class="btn btn-danger" data-act="remove-lock">Remove lock</button>` : ""}</p></div>`;
}

/* ---------- signature pads ---------- */
function pad(id) {
  const cv = $("#" + id); if (!cv) return null;
  const ctx = cv.getContext("2d");
  const fit = () => { cv.width = cv.offsetWidth * 2; cv.height = 260; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#111"; };
  fit(); let draw = false, last = null, used = false;
  const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * 2, (t.clientY - r.top) * 2]; };
  cv.onpointerdown = (e) => { draw = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => { if (!draw) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; used = true; };
  cv.onpointerup = () => (draw = false);
  return { data: () => (used ? cv.toDataURL("image/png") : ""), clear: () => { ctx.clearRect(0, 0, cv.width, cv.height); used = false; } };
}
let padD = null, padC = null;

/* ---------- render + events ---------- */
const isLocked = () => !!S.settings.lockHash && sessionStorage.getItem("mjb-unlocked") !== "1";
function render() {
  const app = $("#app");
  const side = document.querySelector(".sidebar");
  if (isLocked()) {
    if (side) side.style.display = "none";
    app.innerHTML = vLock(); window.scrollTo(0, 0); return;
  }
  if (side) side.style.display = "";
  if (route.view === "dashboard") app.innerHTML = vDashboard();
  else if (route.view === "contracts") app.innerHTML = vContracts();
  else if (route.view === "clients") app.innerHTML = vClients();
  else if (route.view === "client-edit") app.innerHTML = vClientEdit();
  else if (route.view === "picker") app.innerHTML = vPicker();
  else if (route.view === "editor") { app.innerHTML = vEditor(); enableEd(); }
  else if (route.view === "document") { app.innerHTML = vDocument(route.id); padD = pad("pad-d"); padC = pad("pad-c"); }
  else if (route.view === "invoices") app.innerHTML = vInvoices();
  else if (route.view === "invoice") app.innerHTML = vInvoice(route.id);
  else if (route.view === "invoice-edit") app.innerHTML = vInvEditor();
  else if (route.view === "settings") app.innerHTML = vSettings();
  nav();
  window.scrollTo(0, 0);
}
function setPath(o, path, v) { const k = path.split("."); let t = o; for (let i = 0; i < k.length - 1; i++) t = t[k[i]]; t[k[k.length - 1]] = v; }
function refreshPreview() { const p = $("#preview"); if (p && draft) p.innerHTML = docHTML(draft, route.view === "editor"); }
function enableEd() { $$("#preview [data-ep], #preview [data-epn], #preview [data-epw]").forEach((el) => { el.contentEditable = "true"; el.spellcheck = false; }); }
function refreshPreviewEd() { refreshPreview(); enableEd(); }

document.addEventListener("input", (e) => {
  const t = e.target;
  if (route.view === "invoice-edit" && draftInv) {
    if (t.dataset.if) {
      const k = t.dataset.if;
      draftInv[k] = (t.type === "number") ? Number(t.value) : t.value;
      if (k === "contractId" && t.value) {
        const c = S.contracts.find((x) => x.id === t.value);
        if (c) { draftInv.clientName = c.client.name; draftInv.clientEmail = c.client.email; draftInv.currency = c.money.currency; draftInv.vatPct = totals(c).pct; render(); return; }
      }
      refreshInvTotals();
    } else if (t.dataset.ii !== undefined) {
      const [idx, field] = t.dataset.ii.split(":");
      const it = draftInv.items[Number(idx)]; if (!it) return;
      it[field] = (field === "qty" || field === "price") ? Number(t.value) : t.value;
      refreshInvTotals();
    }
    return;
  }
  if (route.view === "client-edit" && draftClient) {
    if (t.dataset.cf) { draftClient[t.dataset.cf] = t.value; }
    return;
  }
  if (route.view === "editor" && draft) {
    if (t.dataset.f) { const num = t.type === "number" || t.dataset.f === "money.depositPct"; setPath(draft, t.dataset.f, num ? Number(t.value) : t.value); refreshPreviewEd(); }
    else if (t.dataset.d !== undefined) { draft.project.deliverables[Number(t.dataset.d)] = t.value; refreshPreviewEd(); }
    else if (t.dataset.pn !== undefined) { draft.duration.phases[Number(t.dataset.pn)].name = t.value; refreshPreviewEd(); }
    else if (t.dataset.pw !== undefined) { draft.duration.phases[Number(t.dataset.pw)].weeks = Number(t.value); refreshPreviewEd(); }
    else {
      const el = t.closest ? t.closest("[data-ep],[data-epn],[data-epw]") : null;
      if (el && $("#preview") && $("#preview").contains(el)) epCommit(el); /* draft only — no re-render, caret stays */
    }
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-act='lock']")) { sessionStorage.removeItem("mjb-unlocked"); route = { view: "dashboard", id: null }; render(); return; }
  const nav = e.target.closest(".navlink"); if (nav) { route = { view: nav.dataset.view, id: null }; render(); return; }
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "new") { route = { view: "picker", id: null }; render(); }
  else if (act === "from-blank") { draft = newFromTemplate(null); route = { view: "editor", id: null }; render(); }
  else if (act === "from-tpl") { draft = newFromTemplate(S.templates.find((x) => x.id === id)); route = { view: "editor", id: null }; render(); }
  else if (act === "save-tpl") {
    if (!persistDraft()) return;
    const name = prompt("Template name:", draft.templateName || draft.project.scope || "Custom service");
    if (!name) return;
    const snap = { id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid(), name,
      scope: draft.project.scope, summary: draft.project.summary, options: draft.project.options,
      deliverables: draft.project.deliverables.slice(), phases: JSON.parse(JSON.stringify(draft.duration.phases)),
      depositPct: draft.money.depositPct, vatPct: totals(draft).pct, pay: { m1: draft.pay.m1, m2: draft.pay.m2 } };
    const i = S.templates.findIndex((x) => x.id === snap.id);
    if (i >= 0) S.templates[i] = snap; else S.templates.push(snap);
    store.save(); toast(`Template "${name}" saved.`);
  }
  else if (act === "open") { route = { view: "document", id }; render(); }
  else if (act === "edit") { const c = S.contracts.find((x) => x.id === id); draft = JSON.parse(JSON.stringify(c)); route = { view: "editor", id }; render(); }
  else if (act === "clone") {
    const c = S.contracts.find((x) => x.id === id); if (!c) return;
    const n = JSON.parse(JSON.stringify(c));
    n.id = uid(); n.ref = "CTR-MJB-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000));
    n.status = "DRAFT"; n.createdAt = todayISO(); n.project.name = (c.project.name || "") + " (copy)";
    n.sign = { designerName: S.settings.designer, designerSig: "", clientName: "", clientSig: "", date: "", paymentMethod: "", paymentDate: "", comments: "" };
    draft = n; route = { view: "editor", id: null }; render(); toast("Cloned as a new draft.");
  }
  else if (act === "preview") { if (persistDraft(true)) { toast("Contract saved."); route = { view: "document", id: draft.id }; render(); } else window.scrollTo(0, 0); }
  else if (act === "save") { if (persistDraft()) toast("Contract saved ✓"); }
  else if (act === "send") { if (persistDraft()) { draft.status = "SENT"; persistDraft(); route = { view: "document", id: draft.id }; render(); } }
  else if (act === "status") {
    const c = S.contracts.find((x) => x.id === id);
    const ok = { DRAFT: ["SENT"], SENT: ["SIGNED"], SIGNED: [], CANCELLED: [] }[c.status] || [];
    if (ok.includes(b.dataset.s)) {
      if (b.dataset.s === "SIGNED" && (!c.sign.designerSig || !c.sign.clientSig)) { alert("Both signatures are required before marking SIGNED."); return; }
      c.status = b.dataset.s; store.save(); render();
    }
  }
  else if (act === "sign-d") {
    const d = padD && padD.data(); if (!d) { alert("Draw the designer signature first."); return; }
    const c = S.contracts.find((x) => x.id === id); c.sign.designerSig = d; c.sign.comments = $("#sg-comments").value; store.save();
    const img = document.createElement("img"); img.src = d; img.alt = "designer signature"; $("#pad-d").replaceWith(img);
    b.disabled = true; b.textContent = "Signed ✓"; toast("Designer signature saved.");
  }
  else if (act === "sign-c") {
    const d = padC && padC.data(); if (!d) { alert("Draw the client signature first."); return; }
    const c = S.contracts.find((x) => x.id === id);
    c.sign.clientSig = d; c.sign.clientName = $("#sg-name").value; c.sign.date = $("#sg-date").value;
    c.sign.paymentMethod = $("#sg-pay").value; c.sign.paymentDate = $("#sg-paydate").value; c.sign.comments = $("#sg-comments").value;
    store.save();
    const img = document.createElement("img"); img.src = d; img.alt = "client signature"; $("#pad-c").replaceWith(img);
    b.disabled = true; b.textContent = "Signed ✓"; toast("Client signature saved.");
  }
  else if (act === "clear-d") padD && padD.clear();
  else if (act === "clear-c") padC && padC.clear();
  else if (act === "invoice") raiseInvoice(id);
  else if (act === "share") {
    const c = S.contracts.find((x) => x.id === id); if (!c) return;
    download(`sign-${c.ref}.html`, buildSignFile(c), "text/html");
    toast("Signing file downloaded. Send it to the client.");
  }
  else if (act === "apply-code") {
    const c = S.contracts.find((x) => x.id === route.id); if (!c) return;
    const raw = prompt("Paste the client return code:");
    if (!raw) return;
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
      if (!p || p.contractId !== c.id || !p.clientSig) { alert("This code does not match the open contract."); return; }
      c.sign.clientName = p.clientName || ""; c.sign.date = p.date || "";
      c.sign.paymentMethod = p.paymentMethod || ""; c.sign.paymentDate = p.paymentDate || "";
      c.sign.comments = p.comments || ""; c.sign.clientSig = p.clientSig;
      if (c.sign.designerSig && c.status === "SENT") c.status = "SIGNED";
      store.save(); toast("Client signature applied."); render();
    } catch (e) { alert("Invalid return code."); }
  }
  else if (act === "open-inv") { route = { view: "invoice", id }; render(); }
  else if (act === "new-inv") { draftInv = blankInv(); route = { view: "invoice-edit", id: null }; render(); }
  else if (act === "cancel-inv") { draftInv = null; route = { view: "invoices", id: null }; render(); }
  else if (act === "add-ii") { if (draftInv) { draftInv.items.push({ name: "", desc: "", qty: 1, price: 0 }); render(); } }
  else if (act === "del-ii") { if (draftInv && draftInv.items.length > 1) { draftInv.items.splice(Number(b.dataset.i), 1); render(); } }
  else if (act === "save-inv") { if (draftInv) persistInv(); }
  else if (act === "paid") { const i = S.invoices.find((x) => x.id === id); i.status = "PAID"; store.save(); render(); }
  else if (act === "add-d") { draft.project.deliverables.push(""); render(); }
  else if (act === "del-d") { if (draft.project.deliverables.length > 1) draft.project.deliverables.splice(Number(b.dataset.i), 1); render(); }
  else if (act === "add-p") { draft.duration.phases.push({ name: "", weeks: 1 }); render(); }
  else if (act === "del-p") { if (draft.duration.phases.length > 1) draft.duration.phases.splice(Number(b.dataset.i), 1); render(); }
  else if (act === "del") { if (confirm("Delete this contract?")) { S.contracts = S.contracts.filter((x) => x.id !== id); S.invoices = S.invoices.filter((x) => x.contractId !== id); store.save(); render(); } }
  else if (act === "save-settings") {
    S.settings.designer = $("#set-designer").value; S.settings.email = $("#set-email").value;
    S.settings.social = $("#set-social").value; S.settings.wm1 = $("#set-wm1").value; S.settings.wm2 = $("#set-wm2").value;
    if ($("#set-adminuser")) S.settings.adminUser = $("#set-adminuser").value.trim() || "mrjamesbrandltd";
    store.save(); alert("Settings saved."); route = { view: "dashboard", id: null }; render();
  }
  else if (act === "backup") { download(`contract-studio-backup-${todayISO()}.json`, JSON.stringify(store.data, null, 2)); toast("Backup downloaded."); }
  else if (act === "restore") { const f = $("#restore-file"); if (f) f.click(); }
  else if (act === "logo-pick") { const f = $("#logo-file"); if (f) f.click(); }
  else if (act === "logo-clear") {
    if (confirm("Remove the studio logo? Invoices will show initials instead.")) { S.settings.logo = ""; store.save(); render(); }
  }
  else if (act === "del-tpl") {
    const t = S.templates.find((x) => x.id === id);
    if (t && confirm(`Delete template "${t.name}"?`)) { S.templates = S.templates.filter((x) => x.id !== id); store.save(); render(); }
  }
  else if (act === "new-client") {
    draftClient = { id: "", name: "", business: "", email: "", phone: "", _isNew: true, _oldKey: "" };
    route = { view: "client-edit", id: null }; render();
  }
  else if (act === "edit-client") {
    const r = S.clients.find((x) => x.id === id) || S.clients.find((x) => ("n:" + String(x.name || "").trim().toLowerCase()) === id);
    if (!r) return;
    draftClient = { ...r, _isNew: false, _oldKey: (r.id || ("n:" + String(r.name || "").trim().toLowerCase())) };
    route = { view: "client-edit", id: null }; render();
  }
  else if (act === "cancel-client") { draftClient = null; route = { view: "clients", id: null }; render(); }
  else if (act === "del-client") {
    const r = S.clients.find((x) => x.id === id) || S.clients.find((x) => ("n:" + String(x.name || "").trim().toLowerCase()) === id);
    if (!r) return;
    const ck = r.id || ("n:" + String(r.name || "").trim().toLowerCase());
    const nc = S.contracts.filter((c) => (c.client.id || ("n:" + String(c.client.name || "").trim().toLowerCase())) === ck).length;
    const ni = S.invoices.filter((i) => {
      const c = i.contractId ? S.contracts.find((x) => x.id === i.contractId) : null;
      return ((c && c.client.id) || (c && ("n:" + String(c.client.name || "").trim().toLowerCase())) || i.clientId || ("n:" + String(i.clientName || "").trim().toLowerCase())) === ck;
    }).length;
    if (nc || ni) { alert(`Cannot delete — this client has ${nc} contract(s) and ${ni} invoice(s). Delete those first.`); return; }
    if (confirm(`Delete client "${r.name}"?`)) { S.clients = S.clients.filter((x) => x !== r); store.save(); render(); toast("Client deleted."); }
  }
  else if (act === "save-client") {
    const d = draftClient;
    if (!d.name.trim()) { const er = $("#err"); if (er) er.innerHTML = `<div class="alert">Client name is required.</div>`; return; }
    if (d._isNew) d.id = store.clientIdFor(d.name);
    const r = upsertClient(d);
    const key = d._isNew ? ("n:" + d.name.trim().toLowerCase()) : d._oldKey;
    S.contracts.forEach((c) => {
      const ck = c.client.id || ("n:" + String(c.client.name || "").trim().toLowerCase());
      if (ck && ck === key) { c.client.name = r.name; c.client.business = r.business; c.client.email = r.email; c.client.phone = r.phone; if (!c.client.id && r.id) c.client.id = r.id; }
    });
    S.invoices.forEach((i) => {
      const linked = i.contractId ? S.contracts.find((x) => x.id === i.contractId) : null;
      const ck = (linked && linked.client.id) || i.clientId || ("n:" + String(i.clientName || "").trim().toLowerCase());
      if (ck && ck === key) { i.clientName = r.name; i.clientEmail = r.email; if (!i.clientId && r.id) i.clientId = r.id; }
    });
    store.save(); draftClient = null;
    route = { view: "clients", id: null }; render(); toast("Client saved everywhere.");
  }
  else if (act === "save-lock") {
    const a = $("#set-pass").value, b2 = $("#set-pass2").value;
    if (!a || a.length < 4) { alert("Password needs at least 4 characters."); return; }
    if (a !== b2) { alert("Passwords do not match."); return; }
    S.settings.lockHash = await sha(a); store.save();
    $("#set-pass").value = ""; $("#set-pass2").value = "";
    toast("Admin lock is on."); render();
  }
  else if (act === "remove-lock") {
    if (confirm("Remove the admin lock?")) { S.settings.lockHash = ""; store.save(); render(); }
  }
});

function epText(el) { return (el.innerText || "").split(String.fromCharCode(160)).join(" ").trim(); }
function epCommit(el) {
  if (!draft) return;
  if (el.dataset.epn !== undefined) { const p = draft.duration.phases[Number(el.dataset.epn)]; if (p) p.name = epText(el); return; }
  if (el.dataset.epw !== undefined) { const p = draft.duration.phases[Number(el.dataset.epw)]; if (p) p.weeks = Number(epText(el).replace(/[^0-9]/g, "")) || 0; return; }
  const path = el.dataset.ep, raw = epText(el);
  if (!path) return;
  if (path === "project.deliverables") { const a = raw.split("\n").map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean); draft.project.deliverables = a.length ? a : [""]; }
  else if (path === "money.quote") draft.money.quote = Number(raw.replace(/[^0-9]/g, "")) || 0;
  else if (path === "money.vatPct") draft.money.vatPct = Math.min(100, Math.max(0, Number(raw.replace(/[^0-9.]/g, "")) || 0));
  else if (path === "money.depositPct") draft.money.depositPct = Math.min(100, Math.max(0, Number(raw.replace(/[^0-9]/g, "")) || 0));
  else if (path === "money.depositPct") draft.money.depositPct = Number(raw.replace(/[^0-9]/g, "")) >= 100 ? 100 : 75;
  else setPath(draft, path, raw);
}
function syncForm() {
  if (!draft || route.view !== "editor") return;
  $$("[data-f]").forEach((i) => { if (document.activeElement === i) return; const v = i.dataset.f.split(".").reduce((o, k) => (o || {})[k], draft); i.value = v == null ? "" : v; });
  const bf = $("#balfield");
  if (bf) bf.value = money(totals(draft).bal, draft.money.currency);
  const tf = $("#totalfield");
  if (tf) tf.value = money(totals(draft).total, draft.money.currency);
}
function toast(m) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); } t.textContent = m; t.className = "show"; clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 2200); }
function vLock() {
  return `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center">
    <form id="lockform" class="card" style="width:100%;max-width:380px">
      <p class="eyebrow">Restricted</p><h1 class="page-title">Admin <span class="hl">login</span></h1>
      <div id="lockerr"></div>
      <label class="f mt">Username<input id="lockuser" autocomplete="username" value="mrjamesbrandltd"></label>
      <label class="f mt">Password<input id="lockpass" type="password" autocomplete="current-password"></label>
      <p class="mt"><button class="btn btn-primary" type="submit" style="width:100%">Unlock</button></p>
    </form></div>`;
}
async function sha(s) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mjb:" + s));
    return "s256:" + Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { let h = 5381; const str = "mjb:" + s; for (let i = 0; i < str.length; i++) h = (((h << 5) + h + str.charCodeAt(i)) | 0); return "dj2:" + (h >>> 0).toString(16); }
}
async function tryUnlock() {
  const u = $("#lockuser").value.trim().toLowerCase(), v = $("#lockpass").value;
  if (u === String(S.settings.adminUser || "").toLowerCase() && (await sha(v)) === S.settings.lockHash) {
    sessionStorage.setItem("mjb-unlocked", "1"); render(); toast("Welcome back.");
  } else { const er = $("#lockerr"); if (er) er.innerHTML = `<div class="alert">Wrong username or password.</div>`; }
}
document.addEventListener("submit", (e) => { if (e.target.id === "lockform") { e.preventDefault(); tryUnlock(); } });
document.addEventListener("focusout", (e) => {
  if (route.view !== "editor" || !draft) return;
  const el = e.target.closest ? e.target.closest("[data-ep],[data-epn],[data-epw]") : null;
  if (el && $("#preview") && $("#preview").contains(el)) { refreshPreviewEd(); syncForm(); }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset && e.target.dataset.pay) {
    const i = S.invoices.find((x) => x.id === route.id); if (!i) return;
    i[e.target.dataset.pay] = e.target.checked;
    if (i.depPaid && i.balPaid) i.status = "PAID";
    else if (i.status === "PAID") i.status = "SENT";
    store.save(); render(); return;
  }
  if (e.target.id === "logo-file") {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Logo must be under 5MB."); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 440, sc = Math.min(1, maxW / img.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        S.settings.logo = cv.toDataURL("image/png");
        store.save(); toast("Logo saved."); render();
      };
      img.onerror = () => alert("Could not read that image.");
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
    return;
  }
  if (e.target.id === "restore-file") {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.contracts) || !d.settings) throw new Error("bad");
        store.data = Object.assign(store.data, d); store.save(); draft = null;
        toast("Backup restored."); route = { view: "dashboard", id: null }; render();
      } catch (_) { alert("Invalid backup file."); }
    };
    r.readAsText(f); e.target.value = "";
  }
});
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type || "application/json" }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
/* Self-contained signing file: static contract + client pad + return-code generator. */
function buildSignFile(c) {
  const doc = docHTML(c);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign ${esc(c.ref)} · MRJAMESBRAND LTD</title><style>
body{margin:0;font-family:Georgia,serif;background:#f6f4ef;color:#111}
main{max-width:900px;margin:auto;padding:24px}
.card{background:#fff;border:1px solid #0000001a;padding:24px;margin:24px 0}
button{min-height:44px;padding:10px 20px;font-weight:700;border:1px solid #000;background:#000;color:#fff;cursor:pointer}
button.lime{background:#b7ff4a;color:#000;border-color:#b7ff4a}
label{display:flex;flex-direction:column;gap:6px;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#00000066;margin-bottom:12px}
input,textarea{font-size:.9rem;padding:10px 12px;border:1px solid #0000001a;width:100%;box-sizing:border-box}
canvas{width:100%;height:150px;border:1px solid #0e2f26;background:#fff;touch-action:none}
textarea.code{min-height:120px;font-size:.7rem}
.doc{background:#fff;border:1px solid #0000001a}
.doc-page{padding:40px 32px;border-bottom:1px solid #e5e7eb}
.doc-top{display:flex;justify-content:flex-end;margin-bottom:60px}
.doc-kicker{border-top:3px solid #0e2f26;border-bottom:1px solid #0e2f26;padding:10px 0;font-size:.72rem;letter-spacing:.28em;color:#0e2f26;font-weight:700}
.doc-hero{font-family:Arial,sans-serif;font-weight:700;font-size:3rem;line-height:.95;margin:0 0 32px}
.doc-info{display:grid;grid-template-columns:40px 1fr 2fr;border:1px solid #0e2f26}
.doc-info>div{padding:10px 14px;border-bottom:1px solid #0e2f26;font-size:.75rem;letter-spacing:.15em;font-weight:700;color:#0e2f26}
.doc-info>div:nth-child(even){border-left:1px solid #0e2f26}
.doc-info .bar{grid-row:span 5;background:#0e2f26;padding:0;border-bottom:0}
.doc-head h2{font-size:1.6rem;margin:0}
.doc-sec-kicker{border-top:3px solid #0e2f26;border-bottom:1px solid #0e2f26;padding:8px 0;font-size:.65rem;letter-spacing:.25em;color:#0e2f26;font-weight:700;margin-bottom:24px}
.doc h4{font-size:1rem;margin:20px 0 8px}
.doc p,.doc li{font-size:.85rem;line-height:1.6}
.doc-beige{background:#f6f4ef;padding:24px;margin:20px 0}
.doc-olive{background:#0e2f26;color:#ffffff;padding:24px;margin:20px 0}
.doc-olive h4{color:#ffffff}
.doc-quote{display:flex;justify-content:space-between;background:#0e2f26;color:#fff;padding:16px 24px;font-size:1.2rem;font-weight:700}.doc-quote span:last-child{color:#b7ff4a}
.doc-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:.85rem}
.doc-table th{background:#f6f4ef;text-align:left;padding:10px;border:1px solid #0e2f26}
.doc-table td{padding:12px;border:1px solid #0e2f26;background:#fffdf7}
.doc-foot{display:flex;justify-content:flex-end;font-size:.65rem;letter-spacing:.25em;font-weight:700;border-top:1px solid #111;padding-top:12px;margin-top:40px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.sig-meta{display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:.85rem;margin-top:12px}
.sig-meta dt{font-weight:700}.sig-meta dd{margin:0;border-bottom:1px solid #0e2f26;min-height:1.4em}
img.sig{width:100%;height:130px;object-fit:contain;border:1px solid #0e2f26;background:#fff}
@media print{.noprint{display:none}.doc,.doc-olive,.doc-quote,.doc-beige,.doc-table th,.doc-info .bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}.doc{border:0}.doc-page{break-after:auto;border:0;padding:36px 40px}.doc-olive,.doc-beige,.doc-quote,.doc-table,.sig-grid{break-inside:avoid}.doc-info>div:empty:not(.bar),.doc td>div:empty,.doc .sig-meta dd:empty{display:none}.doc-info>div:has(+div:empty){display:none}.doc .sig-meta dt:has(+dd:empty){display:none}.doc tr:has(>td:last-child:empty){display:none}}
</style></head><body><main>
<h1>Design Contract · ${esc(c.ref)}</h1>
<p>Please review the contract below, fill in your details, sign, then tap <strong>Generate return code</strong> and send the code back.</p>
${doc}
<div class="card noprint"><h3>Client sign off</h3>
<label>Full name<input id="f-name" value="${esc(c.client.name)}"></label>
<label>Date<input id="f-date" type="date" value="${esc(todayISO())}"></label>
<label>Payment method<input id="f-pay" value=""></label>
<label>Date paid<input id="f-paydate" type="date" value=""></label>
<label>Comments<textarea id="f-comments"></textarea></label>
<label>Draw signature below<canvas id="pad"></canvas></label>
<p><button id="b-clear">Clear</button> <button id="b-code" class="lime">Generate return code</button></p>
<label id="code-wrap" style="display:none">Return code (send this back)<textarea id="code" class="code" readonly></textarea></label>
</div></main><script>
var CID=${JSON.stringify(c.id)};
var cv=document.getElementById("pad"),ctx=cv.getContext("2d"),draw=false,last=null,used=false;
function fit(){cv.width=cv.offsetWidth*1.5;cv.height=225;ctx.lineWidth=5;ctx.lineCap="round";ctx.strokeStyle="#111";}
fit();addEventListener("resize",fit);
function pos(e){var r=cv.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return[(t.clientX-r.left)*1.5,(t.clientY-r.top)*1.5];}
cv.onpointerdown=function(e){draw=true;last=pos(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}};
cv.onpointermove=function(e){if(!draw)return;var p=pos(e);ctx.beginPath();ctx.moveTo(last[0],last[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();last=p;used=true;};
cv.onpointerup=function(){draw=false;};
document.getElementById("b-clear").onclick=function(){ctx.clearRect(0,0,cv.width,cv.height);used=false;};
document.getElementById("b-code").onclick=function(){
if(!used){alert("Draw your signature first.");return;}
var payload={contractId:CID,clientName:document.getElementById("f-name").value,date:document.getElementById("f-date").value,paymentMethod:document.getElementById("f-pay").value,paymentDate:document.getElementById("f-paydate").value,comments:document.getElementById("f-comments").value,clientSig:cv.toDataURL("image/png")};
var code=btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
document.getElementById("code").value=code;document.getElementById("code-wrap").style.display="flex";
document.getElementById("code").select();
alert("Return code ready. Copy it and send it back to the studio.");
};<\/script></body></html>`;
}
/* Create or refresh an explicit client record. */
function upsertClient(rec) {
  if (!rec || (!rec.id && !rec.name)) return null;
  const nm = String(rec.name || "").trim().toLowerCase();
  let r = rec.id ? S.clients.find((x) => x.id === rec.id) : null;
  if (!r && nm) r = S.clients.find((x) => String(x.name || "").trim().toLowerCase() === nm);
  if (r) {
    if (rec.id) r.id = rec.id;
    ["name", "business", "email", "phone"].forEach((k) => { if (rec[k] !== undefined) r[k] = rec[k]; });
  } else {
    r = { id: rec.id || "", name: rec.name || "", business: rec.business || "", email: rec.email || "", phone: rec.phone || "" };
    S.clients.push(r);
  }
  return r;
}
function persistDraft(silent) {
  if (!draft.client.name || !draft.project.name) {    const er = $("#err"); if (er) er.innerHTML = `<div class="alert">Client name and project name are required.</div>`;
    if (!silent) window.scrollTo(0, 0); return false;
  }
  draft.money.depositPct = Number(draft.money.depositPct) >= 100 ? 100 : 75;
  draft.client.id = store.clientIdFor(draft.client.name);
  upsertClient({ id: draft.client.id, name: draft.client.name, business: draft.client.business, email: draft.client.email, phone: draft.client.phone });
  const i = S.contracts.findIndex((x) => x.id === draft.id);
  if (i >= 0) S.contracts[i] = draft; else S.contracts.push(draft);
  store.save(); return true;
}

function raiseInvoice(contractId) {
  const c = S.contracts.find((x) => x.id === contractId); if (!c) return;
  const t = totals(c);
  const inv = {
    id: uid(), ref: "INV-MJB-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000)),
    contractId, status: "SENT", currency: c.money.currency, createdAt: todayISO(),
    dueAt: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    clientName: c.client.name, clientEmail: c.client.email,
    clientId: c.client.id || "",
    depPaid: false, balPaid: false,
    subtotal: t.sub, vat: t.vat, vatPct: t.pct, disc: 0, discPct: 0,
    items: [
      { name: c.project.name, desc: `Deposit ${c.money.depositPct}% — required to start work, VAT inclusive`, qty: 1, price: t.dep },
      { name: c.project.name, desc: "Balance — due before digital files transfer, VAT inclusive", qty: 1, price: t.bal }
    ]
  };
  S.invoices.push(inv); store.save();
  route = { view: "invoice", id: inv.id }; render();
}

/* parallax glow follows scroll at reduced speed */
(function () {
  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const g = $("#glow");
      if (g && !matchMedia("(prefers-reduced-motion: reduce)").matches) g.style.transform = `translateY(${Math.round(scrollY * 0.25)}px)`;
    });
  }, { passive: true });
})();

/* filename follows the open document when printing */
addEventListener("beforeprint", () => {
  const h = document.querySelector("main .page-title");
  if (h) document.title = h.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
});
addEventListener("afterprint", () => { document.title = "Contracts · MRJAMESBRAND LTD"; });

render();
