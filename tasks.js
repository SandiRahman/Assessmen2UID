const STORAGE_KEY = "fokusIn";
const $ = id => document.getElementById(id);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};
const defaults = {
  tasks: [],
  energy: 100,
  distractions: [],
  durations: { focus: 25, short: 5, long: 15 },
  theme: "pagi",
  stats: { day: today(), minutes: 0, sessions: 0 }
};
let data = { ...defaults };
let filter = "all";
let toastTimeout;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const saved = JSON.parse(stored);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
        throw new Error("Format data tidak valid.");
      }
      data = {
        ...defaults,
        ...saved,
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
        distractions: Array.isArray(saved.distractions) ? saved.distractions : [],
        durations: { ...defaults.durations, ...(saved.durations || {}) },
        stats: { ...defaults.stats, ...(saved.stats || {}) }
      };
    }
  } catch (error) {
    data = { ...defaults };
    showToast("Data tugas tidak dapat dibaca. Coba muat ulang halaman.");
  }

  data.tasks = data.tasks
    .filter(task => task && typeof task.text === "string")
    .map(task => ({
      ...task,
      id: task.id == null ? `${Date.now()}-${Math.random()}` : task.id,
      priority: ["tinggi", "sedang", "rendah"].includes(task.priority) ? task.priority : "sedang",
      done: task.done === true,
      date: typeof task.date === "string" ? task.date : ""
    }));
  const energy = Number(data.energy);
  data.energy = Number.isFinite(energy) ? Math.max(0, Math.min(100, energy)) : 100;
  if (data.stats.day !== today()) {
    data.stats = { ...data.stats, day: today(), minutes: 0, sessions: 0 };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    showToast("Perubahan belum tersimpan. Periksa ruang penyimpanan browser.");
    return false;
  }
}

function makeTaskCard(task) {
  const priority = {
    tinggi: { label: "Tinggi", badge: "bg-rose-400/10 text-rose-200", note: "border-rose-300/15 bg-rose-950/20" },
    sedang: { label: "Sedang", badge: "bg-amber-300/10 text-amber-100", note: "border-amber-200/15 bg-amber-950/15" },
    rendah: { label: "Rendah", badge: "bg-emerald-300/10 text-emerald-100", note: "border-emerald-300/15 bg-emerald-950/20" }
  }[task.priority];

  const card = document.createElement("article");
  card.className = `group flex items-start gap-3 rounded-xl border p-3 transition hover:brightness-110 ${priority.note}`;

  const content = document.createElement("div");
  content.className = "min-w-0 flex-1";
  const text = document.createElement("p");
  text.textContent = task.text;
  text.className = `break-words text-sm ${task.done ? "text-white/40 line-through" : "text-white/90"}`;
  const badge = document.createElement("span");
  badge.className = `mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.badge}`;
  badge.textContent = `Prioritas ${priority.label}`;
  content.append(text, badge);

  const completionLabel = document.createElement("label");
  completionLabel.className = "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-2.5 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.className = "h-4 w-4 cursor-pointer accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300";
  checkbox.setAttribute("aria-label", `${task.done ? "Batalkan tugas selesai" : "Tandai tugas selesai"}: ${task.text}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));
  const completionText = document.createElement("span");
  completionText.textContent = task.done ? "Selesai" : "Selesaikan";
  completionLabel.append(checkbox, completionText);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Hapus";
  remove.className = "rounded px-2 py-1 text-xs text-white/50 hover:bg-rose-400/10 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300";
  remove.setAttribute("aria-label", `Hapus tugas: ${task.text}`);
  remove.addEventListener("click", () => deleteTask(task.id));

  card.append(content, completionLabel, remove);
  return card;
}

function renderTasks() {
  const list = $("taskList");
  list.replaceChildren();
  const filtered = data.tasks.filter(task =>
    filter === "all" || (filter === "active" ? !task.done : task.done)
  );

  filtered.forEach(task => list.append(makeTaskCard(task)));
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45";
    empty.textContent = filter === "done" ? "Belum ada tugas yang selesai." : "Belum ada tugas di sini.";
    list.append(empty);
  }
}

function render() {
  const activeCount = data.tasks.filter(task => !task.done).length;
  const doneToday = data.tasks.filter(task => task.done && task.date === today()).length;
  const doneTotal = data.tasks.filter(task => task.done).length;
  const progress = data.tasks.length ? Math.round(doneTotal / data.tasks.length * 100) : 0;

  $("activeCount").textContent = activeCount;
  $("doneCount").textContent = doneToday;
  $("energyCount").textContent = data.energy;
  $("taskCount").textContent = `${activeCount} aktif · ${doneTotal} selesai`;
  $("progressLabel").textContent = `${doneTotal} dari ${data.tasks.length}`;
  $("progressBar").style.width = `${progress}%`;
  $("progressBar").parentElement.setAttribute("aria-valuenow", progress);
  $("progressMessage").textContent = !data.tasks.length
    ? "Tambahkan satu tugas untuk memulai."
    : activeCount === 0
      ? "Semua tugas selesai. Waktunya istirahat sejenak."
      : doneTotal
        ? "Progresmu sudah mulai tumbuh. Lanjut satu langkah lagi?"
        : "Pilih satu tugas yang ingin kamu selesaikan dulu.";
  updateFilterButtons();
  renderTasks();
}

function addTask(text, priority) {
  const title = text.trim();
  if (!title) {
    showToast("Tulis tugas yang ingin ditambahkan.");
    return false;
  }
  if (data.tasks.length >= 80) {
    showToast("Maksimal 80 tugas. Hapus tugas lama untuk menambahkan yang baru.");
    return false;
  }

  data.tasks.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: title.slice(0, 80),
    priority,
    done: false,
    date: ""
  });
  filter = "active";
  save();
  render();
  showToast("Tugas berhasil ditambahkan.");
  return true;
}

function toggleTask(id) {
  const task = data.tasks.find(item => String(item.id) === String(id));
  if (!task) return;
  task.done = !task.done;
  task.date = task.done ? today() : "";
  data.energy = Math.max(0, Math.min(100, data.energy + (task.done ? -5 : 5)));
  filter = task.done ? "done" : "active";
  save();
  render();
  showToast(task.done ? "Tugas selesai! Energi diperbarui 🌱" : "Tugas dikembalikan ke daftar aktif.");
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(task => String(task.id) !== String(id));
  save();
  render();
  showToast("Tugas dihapus.");
}

function updateFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    const selected = button.dataset.filter === filter;
    button.setAttribute("aria-selected", String(selected));
    button.className = `filter-btn border-b-2 px-3 py-2 text-sm font-semibold ${selected ? "border-violet-400 text-white" : "border-transparent text-white/45 hover:text-white"}`;
  });
}

function setFilter(nextFilter) {
  filter = nextFilter;
  render();
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("taskInput");
  if (addTask(input.value, $("priorityInput").value)) {
    input.value = "";
    input.focus();
  }
});

document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

window.addEventListener("storage", event => {
  if (event.key === STORAGE_KEY) {
    load();
    render();
    showToast("Daftar tugas diperbarui dari tab lain.");
  }
});

load();
$("todayLabel").textContent = new Date().toLocaleDateString("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long"
});
render();
