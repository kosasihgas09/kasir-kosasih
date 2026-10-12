
// ======================================
// KASIR WARUNG PRO
// Sistem transaksi, stok, modal, laporan
// ======================================

const $ = id => document.getElementById(id);

// Format nominal uang dengan titik ribuan
function formatRibuan(value) {
  const angka = String(value ?? '').replace(/\D/g, '');
  return angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Baca nominal sebagai angka biasa untuk perhitungan
function nilaiNominal(id) {
  return Number($(id).value.replace(/\D/g, '')) || 0;
}

// Format otomatis saat mengetik
[
  'prodCost',
  'prodPrice',
  'discount',
  'received',
  'capAmount',
  'expAmount'
].forEach(id => {
  $(id).addEventListener('input', event => {
    const input = event.target;
    input.value = formatRibuan(input.value);
  });
});

const rupiah = angka =>
  'Rp' + Number(angka || 0).toLocaleString('id-ID');

const tanggal = () =>
  new Date().toISOString().slice(0, 10);

const buatID = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// DATABASE LOKAL
let db = JSON.parse(
  localStorage.getItem('kasirWarungV1') || 'null'
) || {
  products: [],
  sales: [],
  capital: [],
  expenses: [],
  settings: {
    name: 'Warung Saya',
    address: ''
  }
};

let cart = [];
if (db.settings.name === 'Warung Saya') {
  db.settings.name = 'Kosasih Gaskeun';
  persist();
}


// SIMPAN DATA
function persist() {
  localStorage.setItem(
    'kasirWarungV1',
    JSON.stringify(db)
  );
  renderAll();

if ($('shopName')) {
  $('shopName').value = db.settings.name || '';
}

if ($('shopAddress')) {
  $('shopAddress').value = db.settings.address || '';
}

}

// PINDAH MENU
function showTab(id) {
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== id);
    panel.classList.toggle('active', panel.id === id);
  });
}

// TOMBOL NAVIGASI
$('tabs').addEventListener('click', event => {
  const tombol = event.target.closest('[data-tab]');
  if (tombol) showTab(tombol.dataset.tab);
});

// TABEL
function table(headers, rows) {
  if (!rows.length) return '<p>Belum ada data.</p>';

  return `
    <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    </div>
  `;
}

// KEAMANAN TEKS
function esc(teks) {
  return String(teks ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// =======================
// MANAJEMEN BARANG
// =======================

function renderProducts() {
  $('saleProduct').innerHTML = db.products.map(p =>
    `<option value="${p.id}">
      ${esc(p.name)} - ${rupiah(p.price)} (Stok ${p.stock})
    </option>`
  ).join('');

  $('productTable').innerHTML = table(
    ['Barang', 'Kode', 'Modal', 'Harga Jual', 'Stok', 'Status', 'Aksi'],
    db.products.map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.sku)}</td>
        <td>${rupiah(p.cost)}</td>
        <td>${rupiah(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.stock <= p.min ? 'Stok menipis' : 'Aman'}</td>
        <td>
          <button onclick="editProduct('${p.id}')">Edit</button>
          <button onclick="deleteProduct('${p.id}')">Hapus</button>
        </td>
      </tr>
    `)
  );
}

function resetProduct() {
  ['prodId', 'prodName', 'prodSku', 'prodCost', 'prodPrice']
    .forEach(id => $(id).value = '');

  $('prodStock').value = 0;
  $('prodMin').value = 3;
}

function saveProduct() {
  const name = $('prodName').value.trim();

  if (!name) return alert('Nama barang wajib diisi.');

  const p = {
    id: $('prodId').value || buatID(),
    name,
    sku: $('prodSku').value.trim(),
    cost: nilaiNominal('prodCost'),
    price: nilaiNominal('prodPrice'),
    min: Math.max(0, +$('prodMin').value || 0)
  };

  const index = db.products.findIndex(x => x.id === p.id);

  if (index >= 0) {
    db.products[index] = p;
  } else {
    db.products.push(p);
  }

  resetProduct();
  persist();
}

function editProduct(id) {
  const p = db.products.find(x => x.id === id);
  if (!p) return;

  $('prodId').value = p.id;
  $('prodName').value = p.name;
  $('prodSku').value = p.sku;
  $('prodCost').value = formatRibuan(p.cost);
  $('prodPrice').value = formatRibuan(p.price);
  $('prodStock').value = p.stock;
  $('prodMin').value = p.min;

  showTab('products');
}

function deleteProduct(id) {
  if (!confirm('Hapus barang ini?')) return;

  db.products = db.products.filter(p => p.id !== id);
  persist();
}

// =======================
// KERANJANG TRANSAKSI
// =======================

function addCart() {
  const p = db.products.find(
    x => x.id === $('saleProduct').value
  );

  const qty = +$('saleQty').value;

  if (!p || qty < 1) {
    return alert('Pilih barang dan jumlah yang benar.');
  }

  const line = cart.find(x => x.id === p.id);
  const jumlah = (line?.qty || 0) + qty;

  if (jumlah > p.stock) {
    return alert('Stok tidak mencukupi.');
  }

  if (line) {
    line.qty += qty;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      qty
    });
  }

  renderCart();
}

function cartTotal() {
  const subtotal = cart.reduce(
    (sum, x) => sum + x.price * x.qty,
    0
  );

  return Math.max(
    0,
   subtotal - nilaiNominal('discount')
  );
}

function renderCart() {
  $('cartView').innerHTML = table(
    ['Barang', 'Jumlah', 'Harga', 'Subtotal', 'Aksi'],
    cart.map((x, i) => `
      <tr>
        <td>${esc(x.name)}</td>
        <td>${x.qty}</td>
        <td>${rupiah(x.price)}</td>
        <td>${rupiah(x.price * x.qty)}</td>
        <td>
          <button onclick="cart.splice(${i},1);renderCart()">Hapus</button>
        </td>
      </tr>
    `)
  );

  $('saleTotal').textContent =
    'Total: ' + rupiah(cartTotal());

  $('change').textContent =
    'Kembalian: ' +
      rupiah(Math.max(0, nilaiNominal('received') - cartTotal()));
}

$('discount').addEventListener('input', renderCart);
$('received').addEventListener('input', renderCart);

function clearCart() {
  cart = [];
  renderCart();
}

// =======================
// SIMPAN PENJUALAN
// =======================

function completeSale() {
  if (!cart.length) {
    return alert('Keranjang masih kosong.');
  }

  const total = cartTotal();
  const method = $('payMethod').value;
  const received = nilaiNominal('received');

  if (method === 'Tunai' && received < total) {
    return alert('Uang diterima kurang.');
  }

  for (const item of cart) {
    const p = db.products.find(x => x.id === item.id);

    if (!p || p.stock < item.qty) {
      return alert('Stok tidak mencukupi.');
    }
  }

  const sale = {
    id: buatID(),
    invoice: 'TRX-' + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    cashier: $('cashier').value.trim(),
    customer: $('customer').value || 'Umum',
    method,
    items: cart.map(x => ({ ...x })),
    discount: nilaiNominal('discount'),
    total,
    cost: cart.reduce(
      (sum, x) => sum + x.cost * x.qty,
      0
    ),
    received: method === 'Tunai' ? received : total
  };

  cart.forEach(item => {
    db.products.find(p => p.id === item.id).stock -= item.qty;
  });

  db.sales.push(sale);

  persist();
printReceipt(sale);

printToCleanter(sale).catch(err => {
  console.error('Cleanter:', err);
  alert('Struk tersimpan, tetapi gagal dikirim ke printer.');
});


  clearCart();
  $('received').value = 0;
  $('discount').value = 0;
}

// =======================
// CETAK STRUK
// =======================

function printReceipt(s) {
  localStorage.setItem("thermalPaperWidth", "80");
  ThermalPrinter.setPaperWidth(80);

  const settings = db.settings || {};


  const items = (s.items || []).map(item => ({
    name: item.name,
    qty: item.qty,
    price: item.price,
    total: item.price * item.qty
  }));

  const kembali = Math.max(
    0,
    Number(s.received || 0) - Number(s.total || 0)
  );

  const receiptData = {
    toko: settings.name || "Kosasih Gaskeun",
    logo: "kosasih-gaskeun-logo-thermal.png",
    alamat: settings.address || "",
    telepon: settings.phone || "",
    invoice: s.invoice,
    kasir: s.cashier || "",
    items: items,
    subtotal: items.reduce(
      (sum, item) => sum + item.total,
      0
    ),
    diskon: Number(s.discount || 0),
    total: Number(s.total || 0),
    bayar: Number(s.received || 0),
    kembali: kembali,
footer: "Terima kasih telah berbelanja di Kosasih Gaskeun 🔥 Semoga harimu makin semangat!"
  };

  ThermalPrinter.preview(receiptData);
}

// =======================
// RIWAYAT TRANSAKSI
// =======================

async function printToCleanter(s) {
  const settings = db.settings || {};

  const items = (s.items || []).map(item => ({
    name: item.name,
    qty: item.qty,
    price: Number(item.price || 0),
    total: Number(item.price || 0) * Number(item.qty || 0)
  }));

  const content = [
    {
      type: "text",
      text: settings.name || "Kosasih Gaskeun",
      align: "center",
      bold: true,
      size: "large"
    },

    ...(settings.address ? [{
      type: "text",
      text: settings.address,
      align: "center"
    }] : []),

    {
      type: "divider"
    },

    {
      type: "row",
      left: "No. Transaksi",
      right: s.invoice || "-"
    },

    {
      type: "row",
      left: "Tanggal",
      right: new Date().toLocaleString("id-ID")
    },

    ...(s.cashier ? [{
      type: "row",
      left: "Kasir",
      right: s.cashier
    }] : []),

    {
      type: "divider"
    },

    ...items.flatMap(item => [
      {
        type: "text",
        text: `${item.name} x${item.qty}`,
        align: "left"
      },
      {
        type: "row",
        left: "",
        right: rupiah(item.total)
      }
    ]),

    {
      type: "divider"
    },

    {
      type: "row",
      left: "Subtotal",
      right: rupiah(
        items.reduce((sum, item) => sum + item.total, 0)
      )
    },

    ...(Number(s.discount || 0) > 0 ? [{
      type: "row",
      left: "Diskon",
      right: rupiah(s.discount)
    }] : []),

    {
      type: "row",
      left: "TOTAL",
      right: rupiah(s.total)
    },

    {
      type: "row",
      left: "Bayar",
      right: rupiah(s.received)
    },

    {
      type: "row",
      left: "Kembali",
      right: rupiah(
        Math.max(
          0,
          Number(s.received || 0) - Number(s.total || 0)
        )
      )
    },

    {
      type: "divider"
    },

    {
      type: "text",
      text: "Terima kasih telah berbelanja di Kosasih Gaskeun 🔥",
      align: "center",
      bold: true
    },

    {
      type: "text",
      text: "Semoga harimu makin semangat!",
      align: "center"
    },

    {
      type: "feed",
      lines: 3
    }
  ];

  const response = await fetch("http://localhost:9100/print", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
body: JSON.stringify({
  paperWidth: 80,
  cut: true,
  content: content
})

  });

  if (!response.ok) {
    throw new Error("Cleanter gagal mencetak.");
  }

  return response.json();
}


function renderSales() {
  const d = $('salesDate').value;

  const arr = db.sales.filter(
    s => !d || s.date.slice(0, 10) === d
  ).slice().reverse();

  $('salesTable').innerHTML = table(
    ['No. Transaksi', 'Kasir', 'Metode', 'Total', 'Struk'],
    arr.map(s => `
      <tr>
        <td>${s.invoice}</td>
        <td>${esc(s.cashier)}</td>
        <td>${s.method}</td>
        <td>${rupiah(s.total)}</td>
        <td>
          <button onclick="printReceipt(db.sales.find(x=>x.id==='${s.id}'))">
            Cetak
          </button>
        </td>
      </tr>
    `)
  );
}

// =======================
// MODAL
// =======================

function saveCapital() {
const amount = nilaiNominal('capAmount');

  if (amount <= 0) return alert('Nominal harus lebih dari 0.');

  db.capital.push({
    id: buatID(),
    date: $('capDate').value || tanggal(),
    type: $('capType').value,
    amount,
    note: $('capNote').value
  });

  $('capAmount').value = '';
  $('capNote').value = '';

  persist();
}

// =======================
// PENGELUARAN
// =======================

function saveExpense() {
const amount = nilaiNominal('expAmount');

  if (amount <= 0) return alert('Nominal harus lebih dari 0.');

  db.expenses.push({
    id: buatID(),
    date: $('expDate').value || tanggal(),
    category: $('expCategory').value,
    amount,
    method: $('expMethod').value,
    note: $('expNote').value
  });

  $('expAmount').value = '';
  $('expNote').value = '';

  persist();
}

// =======================
// TABEL KEUANGAN
// =======================

function renderFinance() {
  $('capitalTable').innerHTML = table(
    ['Tanggal', 'Jenis', 'Keterangan', 'Nominal'],
    db.capital.slice().reverse().map(x => `
      <tr>
        <td>${x.date}</td>
        <td>${esc(x.type)}</td>
        <td>${esc(x.note)}</td>
        <td>${rupiah(x.amount)}</td>
      </tr>
    `)
  );

  $('expenseTable').innerHTML = table(
    ['Tanggal', 'Kategori', 'Keterangan', 'Nominal'],
    db.expenses.slice().reverse().map(x => `
      <tr>
        <td>${x.date}</td>
        <td>${esc(x.category)}</td>
        <td>${esc(x.note)}</td>
        <td>${rupiah(x.amount)}</td>
      </tr>
    `)
  );
}

// =======================
// LAPORAN LABA RUGI
// =======================

function sums(from, to) {
  const sales = db.sales.filter(
    s => s.date.slice(0, 10) >= from &&
         s.date.slice(0, 10) <= to
  );

  const caps = db.capital.filter(
    x => x.date >= from && x.date <= to
  );

  const exps = db.expenses.filter(
    x => x.date >= from && x.date <= to
  );

  const revenue = sales.reduce((a, s) => a + s.total, 0);
  const cogs = sales.reduce((a, s) => a + s.cost, 0);
  const expense = exps.reduce((a, x) => a + x.amount, 0);
  const capital = caps.reduce((a, x) => a + x.amount, 0);

  return {
    sales, caps, exps, revenue, cogs, expense, capital,
    gross: revenue - cogs,
    net: revenue - cogs - expense
  };
}

function renderReport() {
  const from = $('fromDate').value || '2000-01-01';
  const to = $('toDate').value || tanggal();
  const v = sums(from, to);

  $('reportView').innerHTML = `
    <h3>Periode ${from} sampai ${to}</h3>
    <table>
      <tr><td>Omzet</td><td>${rupiah(v.revenue)}</td></tr>
      <tr><td>Harga pokok penjualan</td><td>${rupiah(v.cogs)}</td></tr>
      <tr><td>Laba kotor</td><td>${rupiah(v.gross)}</td></tr>
      <tr><td>Pengeluaran</td><td>${rupiah(v.expense)}</td></tr>
      <tr><td><b>Estimasi laba bersih</b></td><td><b>${rupiah(v.net)}</b></td></tr>
      <tr><td>Modal masuk</td><td>${rupiah(v.capital)}</td></tr>
    </table>
  `;
}

// =======================
// DASHBOARD
// =======================

function renderDashboard() {
  const t = tanggal();
  const v = sums(t, t);

  $('metrics').innerHTML = `
    <div class="card dashboard-card omzet">
      <div class="card-icon">💰</div>
      <small>Omzet Hari Ini</small>
      <h2>${rupiah(v.revenue)}</h2>
      <span class="card-help">Total penjualan hari ini</span>
    </div>

    <div class="card dashboard-card laba">
      <div class="card-icon">📈</div>
      <small>Laba Kotor</small>
      <h2>${rupiah(v.gross)}</h2>
      <span class="card-help">Perkiraan keuntungan dari penjualan</span>
    </div>

    <div class="card dashboard-card pengeluaran">
      <div class="card-icon">💸</div>
      <small>Pengeluaran</small>
      <h2>${rupiah(v.expense)}</h2>
      <span class="card-help">Uang yang dikeluarkan hari ini</span>
    </div>

    <div class="card dashboard-card transaksi">
      <div class="card-icon">🧾</div>
      <small>Transaksi</small>
      <h2>${v.sales.length}</h2>
      <span class="card-help">Jumlah transaksi hari ini</span>
    </div>
  `;

  $('todaySummary').innerHTML = `
    <div class="summary-item">
      <span>⚠️ Barang stok menipis</span>
      <b>${db.products.filter(p => p.stock <= p.min).length} barang</b>
    </div>

    <div class="summary-item">
      <span>💵 Estimasi laba bersih</span>
      <b>${rupiah(v.net)}</b>
    </div>
  `;

  $('recent').innerHTML = table(
    ['Nomor', 'Waktu', 'Metode', 'Total'],
    db.sales.slice(-5).reverse().map(s => `
      <tr>
        <td>${s.invoice}</td>
        <td>${new Date(s.date).toLocaleString('id-ID')}</td>
        <td>${s.method}</td>
        <td>${rupiah(s.total)}</td>
      </tr>
    `)
  );
}

function restore(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data.products || !data.sales ||
          !data.capital || !data.expenses) {
        throw new Error('Format tidak sesuai');
      }

      if (confirm('Pulihkan cadangan? Data sekarang akan diganti.')) {
        db = data;
        persist();
        alert('Data berhasil dipulihkan.');
      }
    } catch {
      alert('File cadangan tidak valid.');
    }
  };

  reader.readAsText(file);
}

function clearAll() {
  if (prompt('Ketik HAPUS untuk menghapus semua data:') === 'HAPUS') {
    localStorage.removeItem('kasirWarungV1');

    db = {
      products: [],
      sales: [],
      capital: [],
      expenses: [],
      settings: { name: 'Warung Saya', address: '' }
    };

    persist();
  }
}

function saveSettings() {
  db.settings.name = $('shopName').value.trim();
  db.settings.address = $('shopAddress').value.trim();

  persist();

  alert('Pengaturan toko berhasil disimpan.');
}


// =======================
// MULAI APLIKASI
// =======================

$('today').textContent =
  new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

['capDate', 'expDate', 'salesDate', 'fromDate', 'toDate']
  .forEach(id => $(id).value = tanggal());

$('fromDate').value =
  new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

function renderAll() {
  renderProducts();
  renderSales();
  renderFinance();
  renderDashboard();
  renderCart();
}

renderAll();

function exportCSV() {
  const rows = [];

  // Judul laporan
  rows.push([
    "LAPORAN KASIR KOSASIH"
  ]);

  rows.push([]);

  // =========================
  // TRANSAKSI PENJUALAN
  // =========================
  rows.push([
    "TRANSAKSI PENJUALAN"
  ]);

  rows.push([
    "Tanggal",
    "ID Transaksi",
    "Total",
    "Modal",
    "Laba Kotor"
  ]);

  db.sales.forEach(s => {
    const total = Number(s.total || 0);
    const cost = Number(s.cost || 0);
    const profit = total - cost;

    rows.push([
      s.date || "",
      s.id || "",
      total,
      cost,
      profit
    ]);
  });

  rows.push([]);
  rows.push([]);

  // =========================
  // PENGELUARAN
  // =========================
  rows.push([
    "PENGELUARAN"
  ]);

  rows.push([
    "Tanggal",
    "Keterangan",
    "Jumlah"
  ]);

  db.expenses.forEach(e => {
    rows.push([
      e.date || "",
      e.name || e.description || e.note || "",
      Number(e.amount || e.total || 0)
    ]);
  });

  rows.push([]);
  rows.push([]);

  // =========================
  // STOK BARANG
  // =========================
  rows.push([
    "STOK BARANG"
  ]);

  rows.push([
    "Nama Barang",
    "SKU",
    "Harga Modal",
    "Harga Jual",
    "Stok"
  ]);

  db.products.forEach(p => {
    rows.push([
      p.name || "",
      p.sku || "",
      Number(p.cost || 0),
      Number(p.price || 0),
      Number(p.stock || 0)
    ]);
  });

  // =========================
  // BUAT FILE CSV
  // =========================
  const csv = rows.map(row =>
    row.map(value => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download =
    "laporan-kasir-kosasih-" +
    new Date().toISOString().slice(0, 10) +
    ".csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
