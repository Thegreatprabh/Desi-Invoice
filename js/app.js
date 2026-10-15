/* ============ Desi Invoice — app logic ============
   Free, offline-first GST invoice generator.
   All data stays in localStorage. Nothing leaves the browser.
*/
"use strict";

/* ---------- Indian states with GST codes ---------- */
const STATES = [
  ["01", "Jammu & Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"],
  ["04", "Chandigarh"], ["05", "Uttarakhand"], ["06", "Haryana"],
  ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"],
  ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"],
  ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"],
  ["19", "West Bengal"], ["20", "Jharkhand"], ["21", "Odisha"],
  ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["25", "Daman & Diu"], ["26", "Dadra & Nagar Haveli"], ["27", "Maharashtra"],
  ["28", "Andhra Pradesh"], ["29", "Karnataka"], ["30", "Goa"],
  ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"],
  ["34", "Puducherry"], ["35", "Andaman & Nicobar"], ["36", "Telangana"],
  ["37", "Andhra Pradesh (New)"], ["38", "Ladakh"]
];
const GST_SLABS = [0, 5, 12, 18, 28];
const LS_KEY = "desiInvoice.v1";

/* ---------- state ---------- */
let store = { business: {}, invoices: [], counter: 1, logo: "" };
let editingId = null;

function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) store = Object.assign(store, JSON.parse(raw));
  } catch (e) { /* fresh start */ }
}
function saveStore() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) {}
}

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

function stateLabel(code) {
  const s = STATES.find((x) => x[0] === code);
  return s ? `${s[1]} (${s[0]})` : "—";
}

/* GSTIN: 15 chars — 2 digit state code, 10 char PAN, 1 entity, Z, 1 checksum */
function validGSTIN(g) {
  if (!g) return true; // optional in many fields
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(g.trim());
}

/* ---------- amount in words (Indian numbering) ---------- */
function amountInWords(amount) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function threeDigits(n) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
  }

  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Rupees";
  let parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  let words = parts.join(" ") + " Rupees";
  const paise = Math.round((Math.abs(amount) % 1) * 100);
  if (paise) words += " and " + twoDigits(paise) + " Paise";
  return words;
}

/* ---------- invoice calculation (real GST rules) ---------- */
function calcInvoice() {
  const items = readItems();
  const sameState = $("biz-state").value && $("biz-state").value === $("client-state").value;
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;

  const lines = items.map((it) => {
    const gross = it.qty * it.rate;
    const discount = gross * (it.disc / 100);
    const taxable = Math.max(0, gross - discount);
    const rate = it.gst;
    let c = 0, s = 0, i = 0;
    if (rate > 0) {
      if (sameState) { c = taxable * (rate / 200); s = taxable * (rate / 200); }
      else { i = taxable * (rate / 100); }
    }
    subtotal += taxable; cgst += c; sgst += s; igst += i;
    return Object.assign({}, it, { gross, discount, taxable, cgst: c, sgst: s, igst: i, total: taxable + c + s + i });
  });

  const total = subtotal + cgst + sgst + igst;
  const rounded = Math.round(total);
  return { lines, subtotal, cgst, sgst, igst, total, rounded, roundOff: rounded - total, sameState };
}

function readItems() {
  const rows = document.querySelectorAll("#items-body tr");
  const out = [];
  rows.forEach((tr) => {
    out.push({
      desc: tr.querySelector(".f-desc").value.trim(),
      hsn: tr.querySelector(".f-hsn").value.trim(),
      qty: num(tr.querySelector(".f-qty").value) || 0,
      rate: num(tr.querySelector(".f-rate").value) || 0,
      gst: num(tr.querySelector(".f-gst").value) || 0,
      disc: num(tr.querySelector(".f-disc").value) || 0,
    });
  });
  return out.filter((it) => it.desc || it.qty || it.rate);
}

/* ---------- items table ---------- */
function addItemRow(data) {
  data = data || {};
  const tr = document.createElement("tr");
  const slabs = GST_SLABS.map((s) =>
    `<option value="${s}" ${String(data.gst || 18) === String(s) ? "selected" : ""}>${s}%</option>`).join("");
  tr.innerHTML = `
    <td><input class="f-desc" placeholder="Service / product" value="${esc(data.desc || "")}" /></td>
    <td><input class="f-hsn" placeholder="HSN/SAC" value="${esc(data.hsn || "")}" style="width:90px" /></td>
    <td><input class="f-qty" type="number" min="0" step="any" value="${data.qty != null ? data.qty : 1}" style="width:70px" /></td>
    <td><input class="f-rate" type="number" min="0" step="any" value="${data.rate || ""}" placeholder="0" style="width:100px" /></td>
    <td><select class="f-gst">${slabs}</select></td>
    <td><input class="f-disc" type="number" min="0" max="100" step="any" value="${data.disc || 0}" style="width:64px" /></td>
    <td class="row-total">₹0.00</td>
    <td><button class="row-del" title="Remove">×</button></td>`;
  tr.querySelector(".row-del").addEventListener("click", () => { tr.remove(); refresh(); });
  tr.querySelectorAll("input,select").forEach((el) => el.addEventListener("input", refresh));
  $("items-body").appendChild(tr);
}

function refresh() {
  validateGSTINs();
  updateTaxNote();
  // row totals
  const rows = document.querySelectorAll("#items-body tr");
  rows.forEach((tr) => {
    const qty = num(tr.querySelector(".f-qty").value);
    const rate = num(tr.querySelector(".f-rate").value);
    const disc = num(tr.querySelector(".f-disc").value);
    const taxable = Math.max(0, qty * rate * (1 - disc / 100));
    tr.querySelector(".row-total").textContent = fmt(taxable);
  });
  renderPreview();
  persistBusiness();
}

function validateGSTINs() {
  [["biz-gstin", "biz-gstin-hint"], ["client-gstin", "client-gstin-hint"]].forEach(([id, hintId]) => {
    const el = $(id), hint = $(hintId);
    const v = el.value.trim();
    if (!v) { el.classList.remove("invalid"); hint.textContent = ""; hint.className = "hint"; return; }
    if (validGSTIN(v)) { el.classList.remove("invalid"); hint.textContent = "✓ looks valid"; hint.className = "hint ok"; }
    else { el.classList.add("invalid"); hint.textContent = "✗ invalid GSTIN format"; hint.className = "hint bad"; }
  });
}

function updateTaxNote() {
  const b = $("biz-state").value, c = $("client-state").value;
  const note = $("tax-mode-note");
  if (b && c) {
    note.textContent = b === c
      ? "Same state → CGST + SGST will be applied (split equally)."
      : "Different states → IGST will be applied (full rate).";
  } else note.textContent = "";
}

/* ---------- preview ---------- */
function collectData() {
  return {
    bizName: $("biz-name").value.trim(), bizPhone: $("biz-phone").value.trim(),
    bizAddress: $("biz-address").value.trim(), bizState: $("biz-state").value,
    bizGstin: $("biz-gstin").value.trim().toUpperCase(), bizEmail: $("biz-email").value.trim(),
    bizUpi: $("biz-upi").value.trim(),
    clientName: $("client-name").value.trim(), clientGstin: $("client-gstin").value.trim().toUpperCase(),
    clientAddress: $("client-address").value.trim(), clientState: $("client-state").value,
    supplyState: $("supply-state").value || $("biz-state").value,
    invNumber: $("inv-number").value, invDate: $("inv-date").value, invDue: $("inv-due").value,
    notes: $("inv-notes").value.trim(), terms: $("inv-terms").value.trim(),
    logo: store.logo,
  };
}

function prettyDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function renderPreview() {
  const d = collectData();
  const calc = calcInvoice();
  const rows = calc.lines.map((l, idx) => `
    <tr>
      <td class="desc">${idx + 1}. ${esc(l.desc) || "—"}${l.hsn ? `<small>HSN/SAC: ${esc(l.hsn)}</small>` : ""}</td>
      <td class="num">${l.qty}</td>
      <td class="num">${fmt(l.rate)}</td>
      <td class="num">${l.disc ? l.disc + "%" : "—"}</td>
      <td class="num">${l.gst}%</td>
      <td class="num">${fmt(l.taxable)}</td>
      <td class="num"><b>${fmt(l.total)}</b></td>
    </tr>`).join("") || `<tr><td colspan="7" style="text-align:center;color:#888">No items yet — add one above.</td></tr>`;

  const taxRows = calc.sameState
    ? `<div class="trow"><span>CGST</span><span>${fmt(calc.cgst)}</span></div>
       <div class="trow"><span>SGST</span><span>${fmt(calc.sgst)}</span></div>`
    : `<div class="trow"><span>IGST</span><span>${fmt(calc.igst)}</span></div>`;

  $("invoice-preview").innerHTML = `
    <div class="inv-head">
      <div class="biz-block">
        ${d.logo ? `<img class="inv-logo" src="${d.logo}" alt="logo" />` : ""}
        <h2>${esc(d.bizName) || "Your Business"}</h2>
        <p>${esc(d.bizAddress).replace(/\n/g, "<br>") || ""}</p>
        <p>${d.bizGstin ? "GSTIN: " + esc(d.bizGstin) + " &nbsp;•&nbsp; " : ""}${d.bizPhone ? esc(d.bizPhone) : ""}${d.bizEmail ? "<br>" + esc(d.bizEmail) : ""}</p>
      </div>
      <div class="inv-title">
        <h1>INVOICE</h1>
        <div class="inv-no">${esc(d.invNumber)}</div>
        <div class="inv-dates">Date: ${prettyDate(d.invDate)}<br>Due: ${prettyDate(d.invDue)}</div>
      </div>
    </div>
    <div class="inv-parties">
      <div><h4>Bill To</h4>
        <p><b>${esc(d.clientName) || "—"}</b></p>
        <p>${esc(d.clientAddress).replace(/\n/g, "<br>")}</p>
        <p>${d.clientGstin ? "GSTIN: " + esc(d.clientGstin) + "<br>" : ""}State: ${esc(stateLabel(d.clientState))}</p>
      </div>
      <div><h4>Details</h4>
        <p>Place of supply: <b>${esc(stateLabel(d.supplyState))}</b></p>
        <p>Tax mode: <b>${calc.sameState ? "CGST + SGST" : "IGST"}</b></p>
      </div>
    </div>
    <table class="inv-table">
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Disc</th><th class="num">GST</th><th class="num">Taxable</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-totals"><div class="totals-box">
      <div class="trow"><span>Subtotal</span><span>${fmt(calc.subtotal)}</span></div>
      ${taxRows}
      <div class="trow"><span>Round off</span><span>${fmt(calc.roundOff)}</span></div>
      <div class="trow grand"><span>Total</span><span>${fmt(calc.rounded)}</span></div>
    </div></div>
    <div class="amount-words"><b>Amount in words</b>${esc(amountInWords(calc.rounded))} Only</div>
    <div class="inv-foot">
      <div><h4>Notes</h4><p>${esc(d.notes).replace(/\n/g, "<br>") || "—"}</p><h4 style="margin-top:10px">Terms</h4><p>${esc(d.terms).replace(/\n/g, "<br>") || "—"}</p></div>
      <div class="inv-sign"><span class="sig-line">Authorised signature<br><b>${esc(d.bizName)}</b></span></div>
    </div>
    ${d.bizUpi ? `<div class="upi-strip">💸 Pay via UPI: <b>${esc(d.bizUpi)}</b></div>` : ""}
  `;
  // sync print area
  $("print-area").innerHTML = `<div class="invoice-sheet">${$("invoice-preview").innerHTML}</div>`;
}

/* ---------- persistence ---------- */
function persistBusiness() {
  const d = collectData();
  store.business = {
    bizName: d.bizName, bizPhone: d.bizPhone, bizAddress: d.bizAddress,
    bizState: d.bizState, bizGstin: d.bizGstin, bizEmail: d.bizEmail, bizUpi: d.bizUpi,
    clientName: d.clientName, clientAddress: d.clientAddress, clientState: d.clientState,
    notes: d.notes, terms: d.terms,
  };
  saveStore();
}

function restoreBusiness() {
  const b = store.business || {};
  const set = (id, v) => { if (v != null) $(id).value = v; };
  set("biz-name", b.bizName); set("biz-phone", b.bizPhone); set("biz-address", b.bizAddress);
  set("biz-state", b.bizState); set("biz-gstin", b.bizGstin); set("biz-email", b.bizEmail);
  set("biz-upi", b.bizUpi); set("client-name", b.clientName); set("client-address", b.clientAddress);
  set("client-state", b.clientState); set("inv-notes", b.notes); set("inv-terms", b.terms);
  if (b.bizState) $("supply-state").value = b.bizState;
}

/* ---------- invoice records ---------- */
function nextInvNumber() {
  const n = String(store.counter).padStart(4, "0");
  return `INV-${new Date().getFullYear()}-${n}`;
}

function snapshot() {
  const d = collectData();
  const calc = calcInvoice();
  return {
    id: editingId || ("inv-" + Date.now()),
    number: d.invNumber, date: d.invDate, due: d.invDue,
    biz: { name: d.bizName, phone: d.bizPhone, address: d.bizAddress, state: d.bizState, gstin: d.bizGstin, email: d.bizEmail, upi: d.bizUpi },
    client: { name: d.clientName, gstin: d.clientGstin, address: d.clientAddress, state: d.clientState },
    supplyState: d.supplyState, items: readItems(), notes: d.notes, terms: d.terms,
    logo: d.logo,
    totals: { subtotal: calc.subtotal, cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, total: calc.rounded, sameState: calc.sameState },
    savedAt: new Date().toISOString(),
  };
}

function saveInvoice() {
  if (!$("biz-name").value.trim()) { alert("Please enter your business name first."); $("biz-name").focus(); return; }
  if (!$("client-name").value.trim()) { alert("Please enter the client name."); $("client-name").focus(); return; }
  if (!readItems().length) { alert("Add at least one item."); return; }
  const snap = snapshot();
  const idx = store.invoices.findIndex((x) => x.id === snap.id);
  if (idx >= 0) store.invoices[idx] = snap;
  else { store.invoices.unshift(snap); store.counter++; }
  saveStore();
  editingId = snap.id;
  renderList();
  alert(`Invoice ${snap.number} saved ✓`);
}

function renderList() {
  $("inv-count").textContent = store.invoices.length;
  const box = $("invoice-list");
  if (!store.invoices.length) {
    box.innerHTML = `<div class="empty-state">No invoices yet. Create one and hit Save.</div>`;
    return;
  }
  box.innerHTML = "";
  store.invoices.forEach((inv) => {
    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <div class="inv-meta"><b>${esc(inv.number)}</b>
        <span>${esc(inv.client.name || "—")} • ${prettyDate(inv.date)} • ${fmt(inv.totals.total)}</span>
      </div>
      <div class="inv-actions">
        <button class="btn btn-small btn-ghost" data-act="open">Open</button>
        <button class="btn btn-small btn-ghost" data-act="dup">Duplicate</button>
        <button class="btn btn-small btn-ghost" data-act="print">Print</button>
        <button class="btn btn-small btn-danger" data-act="del">Delete</button>
      </div>`;
    row.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => invoiceAction(inv.id, btn.dataset.act));
    });
    box.appendChild(row);
  });
}

function invoiceAction(id, act) {
  const inv = store.invoices.find((x) => x.id === id);
  if (!inv) return;
  if (act === "del") {
    if (!confirm(`Delete ${inv.number}?`)) return;
    store.invoices = store.invoices.filter((x) => x.id !== id);
    saveStore(); renderList(); return;
  }
  if (act === "dup") {
    const copy = JSON.parse(JSON.stringify(inv));
    copy.id = "inv-" + Date.now();
    copy.number = nextInvNumber();
    store.invoices.unshift(copy); store.counter++;
    saveStore(); renderList(); openInvoice(copy.id);
    return;
  }
  openInvoice(id);
  if (act === "print") setTimeout(() => window.print(), 150);
}

function openInvoice(id) {
  const inv = store.invoices.find((x) => x.id === id);
  if (!inv) return;
  editingId = id;
  showView("editor");
  // business
  $("biz-name").value = inv.biz.name || ""; $("biz-phone").value = inv.biz.phone || "";
  $("biz-address").value = inv.biz.address || ""; $("biz-state").value = inv.biz.state || "";
  $("biz-gstin").value = inv.biz.gstin || ""; $("biz-email").value = inv.biz.email || "";
  $("biz-upi").value = inv.biz.upi || "";
  // client
  $("client-name").value = inv.client.name || ""; $("client-gstin").value = inv.client.gstin || "";
  $("client-address").value = inv.client.address || ""; $("client-state").value = inv.client.state || "";
  $("supply-state").value = inv.supplyState || inv.biz.state || "";
  // meta
  $("inv-number").value = inv.number; $("inv-date").value = inv.date || ""; $("inv-due").value = inv.due || "";
  $("inv-notes").value = inv.notes || ""; $("inv-terms").value = inv.terms || "";
  store.logo = inv.logo || "";
  // items
  $("items-body").innerHTML = "";
  (inv.items.length ? inv.items : [{}]).forEach((it) => addItemRow(it));
  refresh();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function newInvoice() {
  editingId = null;
  $("inv-number").value = nextInvNumber();
  const today = new Date().toISOString().slice(0, 10);
  $("inv-date").value = today;
  const due = new Date(); due.setDate(due.getDate() + 15);
  $("inv-due").value = due.toISOString().slice(0, 10);
  ["client-name", "client-gstin", "client-address"].forEach((id) => { $(id).value = ""; });
  $("items-body").innerHTML = "";
  addItemRow();
  showView("editor");
  refresh();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showView(name) {
  $("view-editor").classList.toggle("hidden", name !== "editor");
  $("view-list").classList.toggle("hidden", name !== "list");
  $("preview-section").classList.toggle("hidden", name !== "editor");
}

/* ---------- init ---------- */
function fillStates() {
  const opts = `<option value="">Select state…</option>` +
    STATES.map(([code, name]) => `<option value="${code}">${name} (${code})</option>`).join("");
  ["biz-state", "client-state", "supply-state"].forEach((id) => { $(id).innerHTML = opts; });
}

function init() {
  loadStore();
  fillStates();
  restoreBusiness();
  if (store.logo) { /* logo preview not needed in editor */ }

  // invoice number + dates
  $("inv-number").value = nextInvNumber();
  const today = new Date().toISOString().slice(0, 10);
  $("inv-date").value = today;
  const due = new Date(); due.setDate(due.getDate() + 15);
  $("inv-due").value = due.toISOString().slice(0, 10);

  addItemRow();

  // events
  ["biz-name", "biz-phone", "biz-address", "biz-gstin", "biz-email", "biz-upi",
   "client-name", "client-gstin", "client-address", "inv-notes", "inv-terms",
   "inv-date", "inv-due"].forEach((id) => $(id).addEventListener("input", refresh));
  ["biz-state", "client-state", "supply-state"].forEach((id) =>
    $(id).addEventListener("change", () => {
      if (id === "biz-state" && !$("supply-state").value) $("supply-state").value = $("biz-state").value;
      refresh();
    }));

  $("btn-add-item").addEventListener("click", () => { addItemRow(); refresh(); });
  $("btn-save").addEventListener("click", saveInvoice);
  $("btn-new").addEventListener("click", newInvoice);
  $("btn-list").addEventListener("click", () => { renderList(); showView("list"); });
  $("btn-print").addEventListener("click", () => window.print());
  $("btn-preview-scroll").addEventListener("click", () =>
    $("preview-section").scrollIntoView({ behavior: "smooth" }));

  $("biz-logo").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 500 * 1024) { alert("Logo should be under 500KB."); return; }
    const r = new FileReader();
    r.onload = () => { store.logo = r.result; saveStore(); refresh(); };
    r.readAsDataURL(f);
  });

  renderList();
  refresh();
}

document.addEventListener("DOMContentLoaded", init);
