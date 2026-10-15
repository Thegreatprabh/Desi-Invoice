<p align="center">
  <h1 align="center">🧾 Desi Invoice</h1>
  <p align="center"><b>Free, offline-first GST invoice generator for Indian freelancers & small businesses.</b></p>
  <p align="center">
    <img alt="No signup" src="https://img.shields.io/badge/No_signup-required-00F5A0?style=for-the-badge" />
    <img alt="Offline" src="https://img.shields.io/badge/Works-offline-00F5A0?style=for-the-badge" />
    <img alt="Privacy" src="https://img.shields.io/badge/Data_stays_in_browser-00F5A0?style=for-the-badge" />
    <img alt="License" src="https://img.shields.io/badge/License-MIT-FFB000?style=for-the-badge" />
  </p>
</p>

---

Tired of paid billing apps and sketchy "free" invoice tools that lock your data? **Desi Invoice** runs entirely in your browser — no account, no server, no tracking. Open it, fill it, print it.

### ✨ Features

- **Real GST logic** — same state → CGST + SGST auto-split · different states → IGST. Just like the law says.
- **GSTIN validation** — instant format check as you type.
- **Amount in words** — proper Indian numbering (lakh / crore), because CAs care.
- **Smart invoice numbering** — auto `INV-2026-0001` sequence, never think about it.
- **Line items** — HSN/SAC, quantity, rate, per-item GST slab (0/5/12/18/28%), discount %.
- **Print / Save as PDF** — pixel-clean A4 invoice, exactly what you see in the preview.
- **Business profiles + invoice history** — saved in your browser, duplicate old invoices in one click.
- **Logo upload & UPI ID** — look professional, get paid faster.
- **100% private** — localStorage only. Your client data never leaves your device.

### 📸 Screenshots

<p align="center">
  <img src="screenshots/editor.jpg" alt="Desi Invoice editor" width="700" />
  <br><sub>Fill in business, client & items — live preview updates instantly</sub>
</p>

<p align="center">
  <img src="screenshots/invoice.jpg" alt="Generated GST invoice" width="700" />
  <br><sub>Print-ready invoice with GST breakup & amount in words</sub>
</p>

### 🚀 Use it

**Option 1 — instant:** open `index.html` in any browser. Done.

**Option 2 — hosted:** enable GitHub Pages on this repo (`Settings → Pages → main branch`) and share your link.

No build step. No dependencies. No npm. It just works — even offline.

### 🧠 How the tax math works

| Situation | Applied as |
|---|---|
| Business & client in the **same state** | **CGST + SGST** (rate split equally) |
| Business & client in **different states** | **IGST** (full rate) |

Place of supply is editable per invoice. Round-off is applied per standard practice and shown transparently.

> ⚠️ Desi Invoice is a tool, not a tax advisor. GST rules change — verify slab rates and HSN codes for your trade, and consult your CA for edge cases.

### 🛠️ Tech

Vanilla HTML + CSS + JS. Zero dependencies, zero build. The whole app is ~35KB.

```
desi-invoice/
├── index.html      # app shell
├── css/styles.css  # dark UI + print stylesheet
└── js/app.js       # GST engine, state, rendering
```

### 🤝 Contributing

Found a bug? GST rule nuance I missed? Open an issue or PR — this is built for the community.

### 📄 License

MIT — free forever, for everyone.

---

<p align="center"><sub>Made with 🇮🇳 for Indian freelancers & small businesses. If it saved you money, give it a ⭐.</sub></p>
