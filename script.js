/* ===== Konstanta & util ===== */
const KEY = 'fokusin_v1';
const LABEL = { fokus: 'Fokus', istirahat: 'Istirahat', panjang: 'Istirahat Panjang' };
const PLANTS = ['🌱', '🌷', '🌻', '🌵', '🌼', '🪴', '🌿', '🍀', '🌸', '🍄'];
const NOTE = {
  tinggi: 'bg-[#FECACA] text-[#450a0a]',
  sedang: 'bg-[#FEF08A] text-[#422006]',
  rendah: 'bg-[#BBF7D0] text-[#052e16]'
};
const $ = id => document.getElementById(id);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ===== Data: load / save ===== */
const defaults = () => ({
  theme: 'pagi', filter: 'all', energy: 100,
  dur: { fokus: 25, istirahat: 5, panjang: 15 },
  tasks: [], distractions: [],
  stats: { day: today(), minutes: 0, sessions: 0 }
});
let state = defaults();
let popId = null; // tanaman terbaru untuk animasi

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') state = { ...defaults(), ...raw };
  } catch (e) { /* abaikan data rusak */ }
  checkDay();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }

// Reset otomatis saat ganti hari
function checkDay() {
  const t = today();
  if (state.stats.day === t) return false;
  state.stats = { day: t, minutes: 0, sessions: 0 };
  state.distractions = [];
  save();
  return true;
}

/* ===== Turunan data ===== */
const doneTasks = () => state.tasks.filter(t => t.done);
const doneToday = () => state.tasks.filter(t => t.done && t.doneDay === today()).length;
const wilted = () => state.distractions.length >= 5;

/* ===== Notifikasi & bunyi ===== */
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('opacity-0'), 3500);
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(d => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + d);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15);
    });
  } catch (e) { }
}

/* ===== Timer ===== */
const timer = { mode: 'fokus', running: false, endAt: 0, left: 0 };
const total = () => state.dur[timer.mode] * 60000;

function setMode(m) { timer.mode = m; timer.running = false; timer.left = total(); renderTimer(); }
function toggleTimer() {
  if (timer.running) { timer.left = Math.max(0, timer.endAt - Date.now()); timer.running = false; }
  else { timer.endAt = Date.now() + timer.left; timer.running = true; }
  renderTimer();
}
function resetTimer() { timer.running = false; timer.left = total(); renderTimer(); }

function finishTimer() {
  const m = timer.mode;
  timer.running = false;
  beep();
  if (m === 'fokus') {
    state.stats.minutes += state.dur.fokus;
    state.stats.sessions++;
    changeEnergy(-15);
  } else changeEnergy(m === 'panjang' ? 30 : 20);
  const next = m === 'fokus' ? (state.stats.sessions % 4 === 0 ? 'panjang' : 'istirahat') : 'fokus';
  toast(`${LABEL[m]} selesai! Siap untuk ${LABEL[next]}.`);
  timer.mode = next; timer.left = total();
  save(); renderAll();
}

function tick() {
  if (checkDay()) renderAll();
  if (!timer.running) return;
  const l = timer.endAt - Date.now();
  if (l <= 0) return finishTimer();
  timer.left = l;
  renderTimer();
}

function renderTimer() {
  const s = Math.ceil(timer.left / 1000);
  const txt = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  $('time').textContent = txt;
  $('bar').style.width = `${100 - (timer.left / total()) * 100}%`;
  $('btnStart').textContent = timer.running ? 'Jeda' : (timer.left < total() ? 'Lanjut' : 'Mulai');
  document.title = timer.running ? `${txt} · ${LABEL[timer.mode]} — fokus.in` : 'fokus.in';
  document.querySelectorAll('#tabs button').forEach(b => {
    const on = b.dataset.mode === timer.mode;
    b.setAttribute('aria-selected', on);
    b.classList.toggle('btn-p', on);
  });
  $('timerHint').textContent = state.energy <= 30 && timer.mode === 'fokus'
    ? '🔋 Energimu tipis. Isi dulu atau ambil istirahat, ya.' : '';
}

/* ===== Energi ===== */
function changeEnergy(n) { state.energy = clamp(state.energy + n, 0, 100); }

function renderEnergy() {
  const e = state.energy;
  const bar = $('energyBar');
  bar.style.width = e + '%';
  bar.style.background = e > 60 ? '#22c55e' : e > 30 ? '#eab308' : '#ef4444';
  $('energyPct').textContent = e + '%';
  $('battery').setAttribute('aria-label', `Energi ${e} persen`);
  $('energyMsg').textContent = e > 60 ? 'Segar! Waktu yang pas buat tugas berat.'
    : e > 30 ? 'Lumayan. Selingi dengan minum air atau peregangan.'
    : 'Hampir habis. Istirahat dulu supaya tamanmu tetap bahagia.';
}

/* ===== Tugas ===== */
function addTask(text, pri) {
  text = text.trim().slice(0, 80);
  if (!text) return;
  state.tasks.unshift({ id: Date.now() + Math.random(), text, pri, done: false, doneDay: null, plant: '' });
  save(); renderTasks();
}
function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) {
    t.doneDay = today();
    t.plant = PLANTS[Math.floor(Math.random() * PLANTS.length)];
    popId = t.id; changeEnergy(-5);
  } else { t.doneDay = null; t.plant = ''; popId = null; changeEnergy(5); }
  save(); renderAll();
}
function deleteTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (t && t.done) changeEnergy(0);
  state.tasks = state.tasks.filter(x => x.id !== id);
  save(); renderAll();
}

function renderTasks() {
  document.querySelectorAll('#filters button').forEach(b => {
    const on = b.dataset.f === state.filter;
    b.classList.toggle('btn-p', on); b.setAttribute('aria-pressed', on);
  });
  const list = state.tasks.filter(t =>
    state.filter === 'all' || (state.filter === 'aktif' ? !t.done : t.done));
  if (!list.length) {
    $('taskList').innerHTML = `<li class="sm:col-span-2 text-muted text-center py-6">${
      state.tasks.length ? 'Tidak ada tugas di filter ini.' : 'Belum ada tugas. Tambah satu dulu yuk ✍️'}</li>`;
    return;
  }
  $('taskList').innerHTML = list.map((t, i) => `
    <li class="${NOTE[t.pri]} rounded-xl p-4 shadow-md flex flex-col gap-3 transition-transform hover:rotate-0"
        style="transform:rotate(${i % 2 ? 1.2 : -1.5}deg)">
      <p class="font-semibold break-words ${t.done ? 'line-through opacity-70' : ''}">${esc(t.text)}</p>
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold uppercase">${esc(t.pri)}</span>
        <span class="flex gap-1">
          <button data-act="toggle" data-id="${t.id}" class="btn !bg-white/70 !text-black !py-1">${t.done ? '↩ Batal' : '✔ Selesai'}</button>
          <button data-act="del" data-id="${t.id}" aria-label="Hapus tugas" class="btn !bg-white/70 !text-black !py-1">🗑</button>
        </span>
      </div>
    </li>`).join('');
}

/* ===== Distraksi ===== */
function addDistraction(label) {
  label = label.trim().slice(0, 40);
  if (!label) return;
  const d = new Date();
  state.distractions.unshift({ id: Date.now() + Math.random(), label, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` });
  save(); renderAll();
}
function renderDistractions() {
  const n = state.distractions.length;
  $('distCount').textContent = n;
  $('distTip').textContent = n === 0 ? '🎉 Hebat, belum ada gangguan hari ini!'
    : n < 5 ? '👍 Masih terkendali, tetap semangat.'
    : '✈️ Gangguan banyak. Coba nyalakan mode pesawat selama sesi fokus.';
  $('distList').innerHTML = n ? state.distractions.map(d => `
    <li class="flex items-center justify-between bg-bg rounded-lg px-3 py-1">
      <span><span class="text-muted">${d.time}</span> · ${esc(d.label)}</span>
      <button data-act="deld" data-id="${d.id}" aria-label="Hapus distraksi ${esc(d.label)}" class="btn !py-0 !px-2">✕</button>
    </li>`).join('') : '<li class="text-muted">Belum ada catatan.</li>';
}

/* ===== Taman ===== */
function renderGarden() {
  const plants = doneTasks();
  const w = wilted();
  const shown = plants.slice(-30);
  $('garden').className = 'flex flex-wrap gap-2 text-3xl min-h-[5rem] transition' + (w ? ' wilt' : '');
  $('garden').innerHTML = shown.length ? shown.map(t =>
    `<span class="${t.id === popId ? 'pop' : ''}" aria-hidden="true">${w ? '🥀' : t.plant}</span>`).join('')
    : '<span class="text-sm text-muted">Taman masih kosong. Selesaikan tugas untuk menanam.</span>';
  $('garden').setAttribute('aria-label', `${plants.length} tanaman`);
  $('gardenMsg').textContent = w
    ? '🥀 Tamanmu layu karena distraksi hari ini sudah 5 atau lebih. Hapus catatan distraksi untuk memulihkannya.'
    : plants.length ? `${plants.length} tanaman tumbuh dari tugas yang kamu selesaikan.`
    : 'Setiap tugas selesai menumbuhkan satu tanaman.';
}

/* ===== Statistik & sapaan ===== */
function renderStats() {
  $('stDone').textContent = doneToday();
  $('stMin').textContent = state.stats.minutes;
  $('stSes').textContent = state.stats.sessions;
}
function renderGreeting() {
  const h = new Date().getHours();
  const s = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  $('greet').textContent = `${s}! Yuk fokus sebentar 🌿`;
}

function renderAll() {
  renderTimer(); renderTasks(); renderEnergy();
  renderDistractions(); renderGarden(); renderStats();
}

/* ===== Event handler ===== */
function bind() {
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('btnStart').addEventListener('click', toggleTimer);
  $('btnReset').addEventListener('click', resetTimer);

  ['fokus', 'istirahat', 'panjang'].forEach(k => {
    const inp = $('d-' + k);
    inp.value = state.dur[k];
    inp.addEventListener('change', () => {
      state.dur[k] = clamp(parseInt(inp.value, 10) || state.dur[k], 1, 120);
      inp.value = state.dur[k];
      if (k === timer.mode && !timer.running) timer.left = total();
      save(); renderTimer();
    });
  });

  $('taskForm').addEventListener('submit', e => {
    e.preventDefault();
    addTask($('taskText').value, $('taskPri').value);
    $('taskText').value = '';
  });
  $('filters').addEventListener('click', e => {
    const b = e.target.closest('[data-f]');
    if (b) { state.filter = b.dataset.f; save(); renderTasks(); }
  });
  $('taskList').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = parseFloat(b.dataset.id);
    b.dataset.act === 'toggle' ? toggleTask(id) : deleteTask(id);
  });

  document.querySelectorAll('[data-energy]').forEach(b => b.addEventListener('click', () => {
    changeEnergy(parseInt(b.dataset.energy, 10));
    toast(`${b.dataset.l}: energi sekarang ${state.energy}%`);
    save(); renderEnergy(); renderTimer();
  }));

  document.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => addDistraction(b.dataset.d)));
  $('distForm').addEventListener('submit', e => {
    e.preventDefault(); addDistraction($('distText').value); $('distText').value = '';
  });
  $('distList').addEventListener('click', e => {
    const b = e.target.closest('[data-act="deld"]'); if (!b) return;
    const id = parseFloat(b.dataset.id);
    state.distractions = state.distractions.filter(d => d.id !== id);
    save(); renderAll();
  });

  $('theme').addEventListener('change', e => applyTheme(e.target.value));
}

function applyTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  $('theme').value = t;
  save();
}

/* ===== Mulai ===== */
load();
timer.left = total();
bind();
applyTheme(state.theme);
renderGreeting();
renderAll();
setInterval(tick, 250);