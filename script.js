
const $ = id => document.getElementById(id);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const defaults = { tasks: [], energy: 100, distractions: [], durations: { focus: 25, short: 5, long: 15 }, theme: "pagi", stats: { day: today(), minutes: 0, sessions: 0 } };
let data = { ...defaults }, mode = "focus", remaining = 1500, total = 1500, endAt = 0, interval = null, filter = "all";
const plants = ["🌱","🌿","🌷","🌻","🌼","🌳"];
const clamp = n => Math.max(0, Math.min(100, n));
function save() { try { localStorage.setItem("fokusIn", JSON.stringify(data)); } catch(e) { toast("Penyimpanan tidak tersedia."); } }
function load() {
  try { const old = JSON.parse(localStorage.getItem("fokusIn")); if (old) data = { ...defaults, ...old, durations: { ...defaults.durations, ...old.durations }, stats: { ...defaults.stats, ...old.stats } }; } catch(e) {}
  if (data.stats.day !== today()) data.stats = { day: today(), minutes: 0, sessions: 0 };
}
function toast(message) { $("toast").textContent = message; $("toast").classList.remove("hidden"); setTimeout(() => $("toast").classList.add("hidden"), 2500); }
function seconds() { return data.durations[mode] * 60; }
function display() {
  const m = Math.floor(remaining / 60), s = remaining % 60;
  $("timerDisplay").textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  document.title = `${$("timerDisplay").textContent} — fokus.in`;
  const percent = Math.floor((1 - remaining / total) * 100 / 10) * 10;
  $("timerProgress").className = `h-full rounded-full bg-violet-500 w-[${percent}%]`;
}
function stop() { clearInterval(interval); interval = null; endAt = 0; $("startBtn").textContent = "MULAI"; }
function setMode(next) {
  stop(); mode = next; total = seconds(); remaining = total;
  document.querySelectorAll(".mode-btn").forEach(b => b.className = `mode-btn flex-1 rounded-xl p-3 font-bold ${b.dataset.mode === mode ? "bg-violet-600 text-white" : "text-white/60"}`);
  $("timerHint").textContent = mode === "focus" ? `Fokus ${data.durations.focus} menit, lalu beri dirimu jeda.` : `Waktunya ${mode === "short" ? "istirahat sejenak" : "istirahat panjang"}.`;
  display();
}
function start() {
  if (interval) { stop(); return; }
  endAt = Date.now() + remaining * 1000; $("startBtn").textContent = "JEDA";
  interval = setInterval(() => {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); display();
    if (!remaining) finish();
  }, 250);
}
function finish() {
  const doneMode = mode; stop(); remaining = 0; display();
  if (doneMode === "focus") {
    data.energy = clamp(data.energy - 15); data.stats.minutes += data.durations.focus; data.stats.sessions++;
    toast("Sesi fokus selesai! Saatnya istirahat 🌿"); setMode("short");
  } else {
    data.energy = clamp(data.energy + (doneMode === "long" ? 30 : 20));
    toast("Istirahat selesai. Siap lanjut?"); setMode("focus");
  }
  save(); render();
  try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 660; o.start(); o.stop(a.currentTime + .3); o.onended = () => a.close(); } catch(e) {}
}
function addTask(text, priority) {
  if (!text.trim()) return;
  if (data.tasks.length >= 80) return toast("Maksimal 80 tugas.");
  data.tasks.push({ id: Date.now() + Math.random(), text: text.trim().slice(0,80), priority, done: false, date: "" });
  save(); render();
}
function toggleTask(id) {
  const task = data.tasks.find(t => t.id == id); if (!task) return;
  task.done = !task.done; task.date = task.done ? today() : "";
  data.energy = clamp(data.energy + (task.done ? -5 : 5)); save(); render();
}
function renderTasks() {
  const list = $("taskList"); list.replaceChildren();
  const tasks = data.tasks.filter(t => filter === "all" || (filter === "active" ? !t.done : t.done));
  $("taskCount").textContent = `${data.tasks.filter(t => !t.done).length} aktif · ${data.tasks.filter(t => t.done).length} selesai`;
  tasks.forEach(t => {
    const card = document.createElement("div"); card.className = "flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3";
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = t.done; check.className = "h-4 w-4 accent-violet-500"; check.addEventListener("change", () => toggleTask(t.id));
    const text = document.createElement("span"); text.textContent = t.text; text.className = `min-w-0 flex-1 break-words text-sm ${t.done ? "line-through text-white/40" : ""}`;
    const del = document.createElement("button"); del.textContent = "×"; del.className = "px-2 text-xl text-white/50"; del.addEventListener("click", () => { data.tasks = data.tasks.filter(x => x.id !== t.id); save(); render(); });
    card.append(check, text, del); list.append(card);
  });
  if (!tasks.length) list.textContent = "Belum ada tugas di sini.";
}
function render() {
  renderTasks();
  $("energyValue").textContent = data.energy + "%";
  $("energyMessage").textContent = data.energy > 60 ? "Energi cukup! Jaga ritmemu 🌱" : data.energy > 30 ? "Mulai melambat. Ambil jeda ya." : "Energi menipis. Kamu perlu istirahat ❤️";
  const level = Math.floor(data.energy / 10) * 10;
  $("energyBar").className = `h-3 rounded-full ${data.energy > 60 ? "bg-green-400" : data.energy > 30 ? "bg-yellow-400" : "bg-rose-400"} w-[${level}%]`;
  $("distractionCount").textContent = data.distractions.length;
  $("distractionTip").textContent = !data.distractions.length ? "Luar biasa! Fokusmu terjaga ✨" : data.distractions.length < 5 ? "Masih terkendali. Yuk kembali fokus." : "Coba aktifkan mode pesawat dan jauhkan ponsel.";
  $("distractionTip").className = `mt-2 text-sm ${data.distractions.length >= 5 ? "text-amber-300" : "text-green-300"}`;
  $("distractionList").replaceChildren();
  data.distractions.slice().reverse().forEach(d => {
    const row = document.createElement("div"); row.className = "flex justify-between rounded-lg bg-black/20 p-2 text-sm";
    const name = document.createElement("span"); name.textContent = `${d.name} · ${d.time}`;
    const del = document.createElement("button"); del.textContent = "Hapus"; del.addEventListener("click", () => { data.distractions = data.distractions.filter(x => x.id !== d.id); save(); render(); });
    row.append(name, del); $("distractionList").append(row);
  });
  const count = Math.min(data.tasks.filter(t => t.done).length, 30), wilted = data.distractions.length >= 5;
  $("gardenMessage").textContent = wilted ? "Tamanmu layu. Kurangi distraksi untuk menyegarkannya." : count ? "Usahamu tumbuh satu per satu 🌱" : "Selesaikan tugas untuk menumbuhkan tanaman.";
  $("gardenPlants").textContent = Array.from({ length: count }, (_,i) => wilted ? "🥀" : plants[i % plants.length]).join(" ");
  $("statTasks").textContent = data.tasks.filter(t => t.done && t.date === today()).length;
  $("statMinutes").textContent = data.stats.minutes; $("statSessions").textContent = data.stats.sessions;
  const themes = { pagi: "from-slate-950 via-slate-900 to-violet-950", hujan: "from-slate-950 via-blue-950 to-slate-900", hutan: "from-green-950 via-slate-900 to-emerald-950", kafe: "from-stone-950 via-amber-950 to-stone-900" };
  document.body.className = `min-h-screen bg-gradient-to-br ${themes[data.theme]} text-white font-sans`;
  $("themeSelect").value = data.theme;
}
$("startBtn").addEventListener("click", start);
$("resetBtn").addEventListener("click", () => { stop(); remaining = total; display(); });
document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
$("durationBtn").addEventListener("click", () => $("durationPanel").classList.toggle("hidden"));
$("saveDuration").addEventListener("click", () => {
  const values = { focus: $("focusDuration").value, short: $("shortDuration").value, long: $("longDuration").value };
  if (Object.values(values).some(v => !Number.isInteger(Number(v)) || v < 1 || v > 120)) return toast("Durasi harus 1–120 menit.");
  Object.keys(values).forEach(k => data.durations[k] = Number(values[k]));
  save(); setMode(mode); toast("Durasi diperbarui.");
});
$("taskForm").addEventListener("submit", e => { e.preventDefault(); addTask($("taskInput").value, $("priorityInput").value); $("taskInput").value = ""; });
document.querySelectorAll(".filter-btn").forEach(b => b.addEventListener("click", () => { filter = b.dataset.filter; renderTasks(); }));
document.querySelectorAll(".energy-btn").forEach(b => b.addEventListener("click", () => { data.energy = clamp(data.energy + Number(b.dataset.energy)); save(); render(); }));
function addDistraction(name) {
  data.distractions.push({ id: Date.now() + Math.random(), name, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }); save(); render(); toast("Distraksi dicatat. Yuk kembali fokus.");
}
document.querySelectorAll(".distraction-btn").forEach(b => b.addEventListener("click", () => addDistraction(b.dataset.name)));
$("distractionForm").addEventListener("submit", e => { e.preventDefault(); if ($("distractionInput").value.trim()) addDistraction($("distractionInput").value.trim()); $("distractionInput").value = ""; });
$("themeSelect").addEventListener("change", e => { data.theme = e.target.value; save(); render(); });
function init() {
  load(); const h = new Date().getHours();
  $("greeting").textContent = h < 11 ? "Selamat pagi!" : h < 15 ? "Selamat siang!" : h < 18 ? "Selamat sore!" : "Selamat malam!";
  $("todayLabel").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  $("focusDuration").value = data.durations.focus; $("shortDuration").value = data.durations.short; $("longDuration").value = data.durations.long;
  render(); setMode("focus");
}
init();
