const ThermalPrinter = {

  // Ukuran kertas thermal
  paperWidth: 80,

  setPaperWidth(width) {
    if (width !== 58 && width !== 80) {
      console.warn("Ukuran kertas hanya 58mm atau 80mm.");
      return;
    }

    this.paperWidth = width;
    localStorage.setItem("thermalPaperWidth", width);
  },

getPaperWidth() {
  const saved = localStorage.getItem("thermalPaperWidth");

  if (saved === "58") {
    this.paperWidth = 58;
  } else {
    this.paperWidth = 80;
  }

  localStorage.setItem("thermalPaperWidth", this.paperWidth);

  return this.paperWidth;
},

  rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(Number(value) || 0);
  },

  dateTime(date = new Date()) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  },

  escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  createReceipt(data) {
    const width = this.paperWidth;
    const esc = this.escapeHtml.bind(this);

    const items = data.items || [];

    const itemHtml = items.map(item => {
      const name = esc(item.name || "Barang");
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const total = Number(item.total || price * qty);

      return `
        <div class="item">
          <div class="item-name">${name}</div>
          <div class="item-detail">
            <span>${qty} x ${this.rupiah(price)}</span>
            <strong>${this.rupiah(total)}</strong>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="receipt">
${data.logo ? `
  <div class="logo">
    <img src="${data.logo}" alt="Kosasih Gaskeun">
  </div>
` : ""}
        <div class="store">
          <div class="store-name">${esc(data.toko || "KASIR WARUNG PRO")}</div>
          ${data.alamat ? `<div>${esc(data.alamat)}</div>` : ""}
          ${data.telepon ? `<div>Telp: ${esc(data.telepon)}</div>` : ""}
        </div>

        <div class="divider"></div>

<div class="info">
  <div>
    <span>No. Transaksi</span>
    <strong>${esc(data.invoice || "-")}</strong>
  </div>

<div>
  <span>Tanggal</span>
  <strong>${esc(this.dateTime(data.date || new Date()))}</strong>
</div>

  ${data.kasir ? `
    <div>
      <span>Kasir</span>
      <strong>${esc(data.kasir)}</strong>
    </div>
  ` : ""}
</div>

        <div class="divider"></div>

        <div class="items">
          ${itemHtml}
        </div>

        <div class="divider"></div>

        <div class="totals">
          <div>
            <span>Subtotal</span>
            <strong>${this.rupiah(data.subtotal)}</strong>
          </div>

          <div>
            <span>Diskon</span>
            <strong>${this.rupiah(data.diskon)}</strong>
          </div>

          <div class="grand-total">
            <span>TOTAL</span>
            <strong>${this.rupiah(data.total)}</strong>
          </div>

          <div>
            <span>Bayar</span>
            <strong>${this.rupiah(data.bayar)}</strong>
          </div>

          <div>
            <span>Kembali</span>
            <strong>${this.rupiah(data.kembali)}</strong>
          </div>
        </div>

        <div class="divider"></div>

        <div class="thanks">
          <div class="thanks-title">TERIMA KASIH</div>
          <div>${esc(data.footer || "Selamat berbelanja!")}</div>
        </div>

      </div>
    `;
  },

  preview(data) {
    const width = this.getPaperWidth();
    const receipt = this.createReceipt(data);

    const w = window.open(
      "",
      "_blank",
      "width=430,height=750"
    );

    if (!w) {
      alert("Izinkan pop-up untuk melihat struk.");
      return;
    }

    w.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Struk ${this.escapeHtml(data.invoice || "")}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px 12px;
            background: #e9ecef;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            color: #111;
          }

          .toolbar {
            width: ${width}mm;
            max-width: 100%;
            margin: 0 auto 14px;
            display: flex;
            gap: 8px;
          }

          .toolbar button {
            flex: 1;
            border: 0;
            border-radius: 8px;
            padding: 11px 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }

          .print-btn {
            background: #111;
            color: #fff;
          }

          .close-btn {
            background: #fff;
            color: #111;
            border: 1px solid #ccc !important;
          }

          .logo {
            text-align: center;
            margin-bottom: 8px;
          }

           .logo img {
             display: block;
             width: 120px;
             max-width: 70%;
             height: auto;
             margin: 0 auto;
             object-fit: contain;
          }     
          .receipt {
            width: ${width}mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 7mm 5mm;
            background: #fff;
            box-shadow: 0 4px 18px rgba(0,0,0,.15);
            font-family:
              "Courier New",
              Courier,
              monospace;
            font-size: ${width === 58 ? "11px" : "12px"};
            line-height: 1.35;
          }

          .store {
            text-align: center;
          }

          .store-name {
            font-size: ${width === 58 ? "17px" : "20px"};
            font-weight: 900;
            letter-spacing: .5px;
            margin-bottom: 5px;
          }

          .store div:not(.store-name) {
            font-size: 10px;
            line-height: 1.45;
          }

          .divider {
            border-top: 1px dashed #222;
            margin: 9px 0;
          }

          .info > div,
          .totals > div {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin: 3px 0;
          }

          .info span,
          .totals span {
            color: #333;
          }

          .info strong,
          .totals strong {
            text-align: right;
            font-weight: 700;
          }

          .item {
            margin: 7px 0;
          }

          .item-name {
            font-weight: 700;
            overflow-wrap: anywhere;
          }

          .item-detail {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding-left: 8px;
            margin-top: 2px;
          }

          .item-detail strong {
            white-space: nowrap;
          }

          .grand-total {
            margin-top: 6px !important;
            padding: 6px 0;
            border-top: 1px solid #111;
            border-bottom: 1px solid #111;
            font-size: 14px;
            font-weight: 900;
          }

          .grand-total strong {
            font-size: 14px;
          }

          .thanks {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
            line-height: 1.5;
          }

          .thanks-title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          @media print {
            @page {
              size: ${width}mm auto;
              margin: 0;
            }

            html,
            body {
              width: ${width}mm;
              margin: 0;
              padding: 0;
              background: #fff;
            }

            .toolbar {
              display: none !important;
            }

            .receipt {
              width: ${width}mm;
              max-width: none;
              margin: 0;
              padding: 5mm 4mm;
              box-shadow: none;
            }
          }
        </style>
      </head>

      <body>

        <div class="toolbar">
          <button
            class="print-btn"
            onclick="window.print()"
          >
            🖨️ CETAK STRUK
          </button>

          <button
            class="close-btn"
            onclick="window.close()"
          >
            ✕ TUTUP
          </button>
        </div>

        ${receipt}

      </body>
      </html>
    `);

    w.document.close();
  }
};

ThermalPrinter.getPaperWidth();

function center(text) {
  return String(text || "");
}

function escapeHtml(text) {
  return ThermalPrinter.escapeHtml(text);
}

console.log(
  "Thermal Printer Module aktif -",
  ThermalPrinter.paperWidth + "mm"
);
