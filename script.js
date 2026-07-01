
// ── AUTH ──────────────────────────────────────────────
async function loginUser() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.querySelector('.btn-login');
  errEl.textContent = '';

  if (!email || !password) {
    errEl.textContent = 'Email dan password tidak boleh kosong.';
    return;
  }

  // Tunjukkan loading di tombol
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite;vertical-align:-2px;margin-right:6px"></i> Memproses...';
  btn.disabled  = true;

  const { error } = await supa.auth.signInWithPassword({ email, password });

  btn.innerHTML = '<i class="ti ti-login" style="vertical-align:-2px;margin-right:6px"></i> Masuk Sekarang';
  btn.disabled  = false;

  if (error) {
    errEl.textContent = error.message;
    return;
  }

  showDashboard();
  loadFromSupabase();
}

function showDashboard() {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('mainHeader').style.display   = 'flex';
  document.getElementById('mainLayout').style.display   = 'flex';
}

async function checkSession() {
  const { data: { session } } = await supa.auth.getSession();
  if (session) {
    showDashboard();
    loadFromSupabase();
  }
  // Jika tidak ada session → login screen tetap tampil (default)
}

async function logout() {
  await supa.auth.signOut();
  location.reload();
}

// ── DATA ──────────────────────────────────────────────
const KELS = ['Tikala Ares','Banjer','Tikala Baru','Taas','Paal IV'];
let active = 0;
let store  = {};
let agChart = null, kwnChart = null, kawinChart = null;
let formVisible = true;
let saving = false;

function iv(id)  { return parseInt(document.getElementById(id).value) || 0; }
function gag()   { return [...document.querySelectorAll('.ag')].map(e => parseInt(e.value) || 0); }
function fmt(n)  { return Number(n).toLocaleString('id-ID'); }
function pct(a,b){ return b > 0 ? Math.round(a / b * 100) : 0; }

function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.style.background = ok ? 'var(--red-dark)' : '#B45309';
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setLoading(on) {
  if (on) {
    document.getElementById('dashArea').innerHTML = `<div class="empty">
      <i class="ti ti-loader" style="animation:spin 1s linear infinite"></i>
      <p>Memuat data dari server...</p>
    </div>`;
  }
}

async function loadFromSupabase() {
  setLoading(true);
  try {
    const { data, error } = await supa.from('penduduk').select('kelurahan, data');
    if (error) throw error;
    KELS.forEach(k => { store[k] = null; });
    data.forEach(row => { store[row.kelurahan] = row.data; });
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, false);
    KELS.forEach(k => { if (!(k in store)) store[k] = null; });
  }
  buildSidebar(); loadIntoForm(); render();
}

async function saveToSupabase(kelurahan, data) {
  const { error } = await supa.from('penduduk').upsert(
    { kelurahan, data, updated_at: new Date().toISOString() },
    { onConflict: 'kelurahan' }
  );
  if (error) throw error;
}

async function deleteFromSupabase(kelurahan) {
  const { error } = await supa.from('penduduk').delete().eq('kelurahan', kelurahan);
  if (error) throw error;
}

function toggleForm() {
  formVisible = !formVisible;
  const body = document.getElementById('formBody');
  const btn  = document.getElementById('toggleBtn');
  if (formVisible) {
    body.style.maxHeight = body.scrollHeight + 2000 + 'px';
    body.classList.remove('collapsed');
    btn.innerHTML = '<i class="ti ti-chevron-up"></i> Sembunyikan';
  } else {
    body.style.maxHeight = '0px';
    body.classList.add('collapsed');
    btn.innerHTML = '<i class="ti ti-chevron-down"></i> Tampilkan form';
  }
}

function buildSidebar() {
  const list = document.getElementById('kelList');
  list.innerHTML = '';
  let totalAll = 0;
  KELS.forEach((k, i) => {
    const d     = store[k];
    const total = d ? (d.pdkLk + d.pdkPr) : 0;
    totalAll   += total;
    const btn   = document.createElement('button');
    btn.className = 'kel-btn' + (i === active ? ' active' : '') + (d ? ' has-data' : '');
    btn.innerHTML = `<span class="dot"></span><span class="kel-btn-lbl">${k}</span>${d ? `<span class="kel-btn-count">${fmt(total)}</span>` : ''}`;
    btn.onclick = () => { active = i; loadIntoForm(); buildSidebar(); render(); };
    list.appendChild(btn);
  });
  document.getElementById('totalAllPdk').textContent = totalAll > 0 ? fmt(totalAll) : '—';
}

function loadIntoForm() {
  const k = KELS[active];
  document.getElementById('formKelLabel').textContent = k;
  document.getElementById('pageHeading').textContent  = 'Data Penduduk';
  document.getElementById('pageSubtitle').textContent = 'Data penduduk per bulan · ' + k;
  const d = store[k];
  ['kkLk','kkPr','pdkLk','pdkPr','kwLk','kwPr','blLk','blPr',
   'wniLk','wniPr','wnaLk','wnaPr',
   'lhrLk','lhrPr','mtiLk','mtiPr','pndLk','pndPr','dtgLk','dtgPr'].forEach(f => {
    document.getElementById(f).value = d && d[f] ? d[f] : '';
  });
  document.querySelectorAll('.ag').forEach((el, i) => { el.value = d && d.ag ? d.ag[i] || '' : ''; });
  document.getElementById('inPeriode').value = d && d.periode ? d.periode : '';
  // Buka form jika sedang tertutup
  if (!formVisible) toggleForm();
  const body = document.getElementById('formBody');
  if (formVisible) body.style.maxHeight = body.scrollHeight + 2000 + 'px';
}

async function saveAndRender() {
  if (saving) return;
  saving = true;
  const saveBtn = document.querySelector('.btn-save');
  saveBtn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Menyimpan...';
  saveBtn.disabled  = true;
  const k = KELS[active];
  const payload = {
    kkLk: iv('kkLk'), kkPr: iv('kkPr'),
    pdkLk: iv('pdkLk'), pdkPr: iv('pdkPr'),
    kwLk: iv('kwLk'), kwPr: iv('kwPr'),
    blLk: iv('blLk'), blPr: iv('blPr'),
    ag: gag(),
    wniLk: iv('wniLk'), wniPr: iv('wniPr'),
    wnaLk: iv('wnaLk'), wnaPr: iv('wnaPr'),
    lhrLk: iv('lhrLk'), lhrPr: iv('lhrPr'),
    mtiLk: iv('mtiLk'), mtiPr: iv('mtiPr'),
    pndLk: iv('pndLk'), pndPr: iv('pndPr'),
    dtgLk: iv('dtgLk'), dtgPr: iv('dtgPr'),
    periode: document.getElementById('inPeriode').value.trim()
  };
  try {
    await saveToSupabase(k, payload);
    store[k] = payload;
    buildSidebar(); render();
    showToast('✓ Data ' + k + ' tersimpan ke server');
  } catch(e) {
    showToast('Gagal simpan: ' + e.message, false);
  }
  saveBtn.innerHTML = '<i class="ti ti-device-floppy"></i> Simpan &amp; tampilkan';
  saveBtn.disabled  = false;
  saving = false;
}

async function clearCurrent() {
  const k = KELS[active];
  if (!confirm('Hapus semua data ' + k + ' dari server?')) return;
  try {
    await deleteFromSupabase(k);
    store[k] = null;
    loadIntoForm(); buildSidebar(); render();
    showToast('Data ' + k + ' dihapus');
  } catch(e) {
    showToast('Gagal hapus: ' + e.message, false);
  }
}

function destroyCharts() {
  [agChart, kwnChart, kawinChart].forEach(c => c && c.destroy());
  agChart = kwnChart = kawinChart = null;
}

function render() {
  const k    = KELS[active];
  const d    = store[k];
  const area = document.getElementById('dashArea');
  destroyCharts();
  const periode = d && d.periode ? d.periode : '—';
  document.getElementById('periodeBadge').textContent = periode;
  document.getElementById('topPeriode').textContent   = periode !== '—' ? periode : '2025';
  if (!d) {
    area.innerHTML = `<div class="empty">
      <i class="ti ti-chart-dots"></i>
      <p>Belum ada data untuk <strong>${k}</strong><br>Isi form di atas lalu klik <strong>Simpan &amp; tampilkan</strong></p>
    </div>`;
    return;
  }
  const totalPdk = d.pdkLk + d.pdkPr;
  const totalKK  = d.kkLk  + d.kkPr;
  const agTotal  = d.ag.reduce((a, b) => a + b, 0);
  const lkP = pct(d.pdkLk, totalPdk);
  const prP = pct(d.pdkPr, totalPdk);
  const maxBar = Math.max(d.pdkLk + d.pdkPr, d.kkLk + d.kkPr, d.kwLk + d.kwPr, d.blLk + d.blPr, 1);
  area.innerHTML = `
    <div class="metrics">
      <div class="met"><div class="met-icon"><i class="ti ti-users"></i></div><div class="met-lbl">Total Penduduk</div><div class="met-val">${fmt(totalPdk)}</div><div class="met-sub">${fmt(d.pdkLk)} Lk · ${fmt(d.pdkPr)} Pr</div><div class="met-bar"><div class="met-fill" style="width:100%;background:linear-gradient(90deg,var(--red),var(--red-light))"></div></div></div>
      <div class="met"><div class="met-icon"><i class="ti ti-gender-male"></i></div><div class="met-lbl">Laki-laki</div><div class="met-val">${fmt(d.pdkLk)}</div><div class="met-sub">${lkP}% dari total</div><div class="met-bar"><div class="met-fill" style="width:${lkP}%;background:linear-gradient(90deg,var(--blue),#4A9EE8)"></div></div></div>
      <div class="met"><div class="met-icon"><i class="ti ti-gender-female"></i></div><div class="met-lbl">Perempuan</div><div class="met-val">${fmt(d.pdkPr)}</div><div class="met-sub">${prP}% dari total</div><div class="met-bar"><div class="met-fill" style="width:${prP}%;background:linear-gradient(90deg,var(--gold),#F2C453)"></div></div></div>
      <div class="met"><div class="met-icon"><i class="ti ti-home"></i></div><div class="met-lbl">Total KK</div><div class="met-val">${fmt(totalKK)}</div><div class="met-sub">${fmt(d.kkLk)} Lk · ${fmt(d.kkPr)} Pr</div><div class="met-bar"><div class="met-fill" style="width:100%;background:linear-gradient(90deg,var(--green),#25C16F)"></div></div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-hdr"><div class="icon-wrap"><i class="ti ti-users-group"></i></div><h3>Perbandingan Laki-laki / Perempuan</h3></div>
        <div class="leg"><span><span class="ldot" style="background:var(--blue)"></span>Laki-laki ${lkP}%</span><span><span class="ldot" style="background:var(--red)"></span>Perempuan ${prP}%</span></div>
        ${barRow('Penduduk', d.pdkLk, d.pdkPr, maxBar)}${barRow('KK', d.kkLk, d.kkPr, maxBar)}${barRow('Kawin', d.kwLk, d.kwPr, maxBar)}${barRow('Belum Kawin', d.blLk, d.blPr, maxBar)}${barRow('WNI', d.wniLk, d.wniPr, maxBar)}${barRow('WNA', d.wnaLk, d.wnaPr, maxBar)}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="icon-wrap"><i class="ti ti-arrows-exchange-2"></i></div><h3>Mutasi Penduduk</h3></div>
        ${mutRow('Lahir',  'var(--green)', d.lhrLk, d.lhrPr)}
        ${mutRow('Mati',   'var(--red)',   d.mtiLk, d.mtiPr)}
        ${mutRow('Pindah', 'var(--gold)',  d.pndLk, d.pndPr)}
        ${mutRow('Datang', 'var(--blue)',  d.dtgLk, d.dtgPr)}
      </div>
    </div>
    <div class="grid2">
      <div class="chart-card">
        <div class="chart-card-hdr"><div class="icon-wrap"><i class="ti ti-building-mosque"></i></div><h3>Agama &amp; Aliran Kepercayaan</h3></div>
        <div class="leg">${['Islam','Kristen','Katholik','Hindu','Budha','Konghuchu'].map((n,i)=>{const c=['#C0152A','#1A6CCC','#E8A020','#137A45','#7F77DD','#D4537E'];return`<span><span class="ldot" style="background:${c[i]}"></span>${n} ${pct(d.ag[i],agTotal)}%</span>`;}).join('')}</div>
        <div style="position:relative;height:200px"><canvas id="agCanvas"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-hdr"><div class="icon-wrap"><i class="ti ti-id-badge-2"></i></div><h3>Kewarganegaraan</h3></div>
        <div class="leg"><span><span class="ldot" style="background:var(--blue)"></span>WNI ${pct(d.wniLk+d.wniPr,d.wniLk+d.wniPr+d.wnaLk+d.wnaPr)}%</span><span><span class="ldot" style="background:var(--gold)"></span>WNA ${pct(d.wnaLk+d.wnaPr,d.wniLk+d.wniPr+d.wnaLk+d.wnaPr)}%</span></div>
        <div style="position:relative;height:200px"><canvas id="kwnCanvas"></canvas></div>
      </div>
    </div>
    <div class="chart-card" style="margin-bottom:24px">
      <div class="chart-card-hdr"><div class="icon-wrap"><i class="ti ti-heart"></i></div><h3>Status Perkawinan</h3></div>
      <div style="position:relative;height:160px"><canvas id="kawinCanvas"></canvas></div>
    </div>`;

  const agColors = ['#C0152A','#1A6CCC','#E8A020','#137A45','#7F77DD','#D4537E'];
  agChart = new Chart(document.getElementById('agCanvas'), {
    type: 'bar',
    data: { labels: ['Islam','Kristen','Katholik','Hindu','Budha','Konghuchu'], datasets: [{ label: 'Jiwa', data: d.ag, backgroundColor: agColors, borderWidth: 0, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' jiwa (' + pct(c.raw, agTotal) + '%)' } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => fmt(v), font: { size: 11 } } } } }
  });

  const wniTot = d.wniLk + d.wniPr, wnaTot = d.wnaLk + d.wnaPr;
  kwnChart = new Chart(document.getElementById('kwnCanvas'), {
    type: 'doughnut',
    data: { labels: ['WNI','WNA'], datasets: [{ data: [wniTot, wnaTot], backgroundColor: ['#1A6CCC','#E8A020'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' (' + pct(c.raw, wniTot + wnaTot) + '%)' } } } }
  });

  kawinChart = new Chart(document.getElementById('kawinCanvas'), {
    type: 'bar',
    data: { labels: ['Kawin Lk','Kawin Pr','Belum Kawin Lk','Belum Kawin Pr'], datasets: [{ label: 'Jiwa', data: [d.kwLk, d.kwPr, d.blLk, d.blPr], backgroundColor: ['#1A6CCC','#C0152A','#7BB8F0','#F57885'], borderWidth: 0, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' jiwa' } } }, scales: { x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => fmt(v), font: { size: 11 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
  });
}

function barRow(lbl, lk, pr, max) {
  const tot = lk + pr;
  if (tot === 0) return '';
  const wL = Math.round(lk / max * 100), wP = Math.round(pr / max * 100);
  return `<div class="bar-row"><div class="bar-lbl">${lbl}</div><div class="bar-track"><div class="bf-lk" style="width:${wL}%"></div><div class="bf-pr" style="width:${wP}%"></div></div><div class="bar-num">${fmt(tot)}</div></div>`;
}

function mutRow(lbl, col, lk, pr) {
  return `<div class="mut-row"><div class="mut-left"><span class="mut-dot" style="background:${col}"></span><span class="mut-lbl">${lbl}</span></div><div class="pills"><span class="pill pl-lk">Lk ${fmt(lk)}</span><span class="pill pl-pr">Pr ${fmt(pr)}</span><span class="pill pl-tot">${fmt(lk + pr)}</span></div></div>`;
}

// ── SLIDESHOW ─────────────────────────────────────────
const slideLabels = [
  'Bunaken · Surga Bawah Laut Indonesia',
  'Pantai Malalayang · Keindahan Teluk Manado',
  'Gunung Klabat · Puncak Tertinggi Sulut',
  'Kota Manado · Bumi Nyiur Melambai'
];
let currentSlide = 0;
function goSlide(n) {
  const slides = document.querySelectorAll('.login-bg-slide');
  const dots   = document.querySelectorAll('.login-dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = n;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  document.getElementById('slideLabel').textContent = slideLabels[currentSlide];
}
setInterval(() => goSlide((currentSlide + 1) % 4), 5000);

// ── START ─────────────────────────────────────────────
checkSession();
