/* app.js — 75-day Hard / Medium / Easy tracker */

const TOTAL_DAYS = 75;

const TIERS = {
  hard: {
    label: 'Hard',
    color: '#C4432B',
    desc: 'Classic 75 Hard. Two 45-min workouts (one outdoors), a strict diet with zero cheats or alcohol, a gallon of water, 10 pages of reading, and a daily photo. Miss anything and the run resets to Day 1.',
    tasks: [
      { id: 'diet',     label: 'Stick to your diet — no cheat meals, no alcohol' },
      { id: 'workout1', label: '45-minute workout #1' },
      { id: 'workout2', label: '45-minute workout #2 — outdoors' },
      { id: 'water',    label: 'Drink 1 gallon (3.7L) of water' },
      { id: 'read',     label: 'Read 10 pages of non-fiction' },
      { id: 'photo',    label: 'Take a progress photo' },
    ],
    restartOnMiss: true,
  },
  medium: {
    label: 'Medium',
    color: '#D69A2D',
    desc: 'A steadier version. One 45-min workout, 3L of water, 10 pages of reading, one planned cheat meal a week, and a daily photo. Miss a day and the run resets to Day 1.',
    tasks: [
      { id: 'diet',     label: 'Stick to your diet — one planned cheat meal per week' },
      { id: 'workout1', label: '45-minute workout' },
      { id: 'water',    label: 'Drink 3L of water' },
      { id: 'read',     label: 'Read 10 pages' },
      { id: 'photo',    label: 'Take a progress photo' },
    ],
    restartOnMiss: true,
  },
  easy: {
    label: 'Easy',
    color: '#5C8A6B',
    desc: 'A gentler entry point. Eat mindfully, move for 30 minutes, drink 2L of water, read or listen for 10 minutes, and take a photo. A missed day is logged, but the run keeps going.',
    tasks: [
      { id: 'diet',     label: 'Eat mindfully — skip processed junk' },
      { id: 'workout1', label: '30-minute workout or walk' },
      { id: 'water',    label: 'Drink 2L of water' },
      { id: 'read',     label: 'Read or listen for 10 minutes' },
      { id: 'photo',    label: 'Take a progress photo' },
    ],
    restartOnMiss: false,
  },
};

let state = {
  tier: null,
  startDate: null,
  status: 'active', // active | failed | completed
  currentDay: 1,
  todayRecord: null,
  todayPhotoUrl: null,
  activeTab: 'today',
  failedAtDay: null,
};

/* ---------- date helpers ---------- */
function dateOnly(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDateOnly(d) {
  const x = dateOnly(d);
  return `${x.getFullYear().toString().padStart(4, '0')}-${(x.getMonth() + 1).toString().padStart(2, '0')}-${x.getDate().toString().padStart(2, '0')}`;
}
function daysBetween(a, b) {
  return Math.round((dateOnly(b) - dateOnly(a)) / 86400000);
}
function dateForDay(dayNum) {
  const d = dateOnly(state.startDate);
  d.setDate(d.getDate() + (dayNum - 1));
  return d;
}

function currentTier() {
  return TIERS[state.tier];
}

function emptyTasks() {
  const t = {};
  currentTier().tasks.forEach((task) => { t[task.id] = false; });
  return t;
}

async function isDayComplete(dayNum) {
  const rec = await DB.getDay(dayNum);
  const tier = currentTier();
  for (const task of tier.tasks) {
    if (task.id === 'photo') {
      const photo = await DB.getPhoto(dayNum);
      if (!photo) return false;
    } else if (!rec || !rec.tasks[task.id]) {
      return false;
    }
  }
  return true;
}

/* ---------- boot ---------- */
async function boot() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  const settings = await DB.getMeta('settings');
  if (!settings) {
    showOnboarding();
    return;
  }
  state.tier = settings.tier;
  state.startDate = settings.startDate;
  state.status = settings.status;
  state.failedAtDay = settings.failedAtDay || null;

  await recomputeStatus();
  showApp();
}

function showOnboarding() {
  document.getElementById('onboard').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  renderTierCards();
}

function showApp() {
  document.getElementById('onboard').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  applyTierColor();
  renderAll();
}

function applyTierColor() {
  document.documentElement.style.setProperty('--accent', currentTier().color);
  document.documentElement.style.setProperty('--accent-soft', hexToRgba(currentTier().color, 0.16));
}
function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------- status / streak logic ---------- */
async function recomputeStatus() {
  const today = new Date();
  const rawDayIndex = daysBetween(state.startDate, today) + 1;
  const dayIndex = Math.min(rawDayIndex, TOTAL_DAYS + 1);

  if (state.status === 'active') {
    for (let d = 1; d < dayIndex; d++) {
      const complete = await isDayComplete(d);
      if (!complete) {
        if (currentTier().restartOnMiss) {
          state.status = 'failed';
          state.failedAtDay = d;
          await DB.setMeta('settings', {
            tier: state.tier, startDate: state.startDate,
            status: 'failed', failedAtDay: d,
          });
          break;
        }
        // easy tier: keep going, just mark that day as missed (no record write needed)
      }
    }
  }

  if (state.status === 'active' && rawDayIndex > TOTAL_DAYS) {
    state.status = 'completed';
    await DB.setMeta('settings', {
      tier: state.tier, startDate: state.startDate, status: 'completed',
    });
  }

  state.currentDay = Math.min(Math.max(rawDayIndex, 1), TOTAL_DAYS);
}

async function computeStreak() {
  const upTo = state.status === 'failed' ? state.failedAtDay - 1 : state.currentDay;
  let streak = 0;
  for (let d = upTo; d >= 1; d--) {
    const complete = await isDayComplete(d);
    if (complete) streak++;
    else break;
  }
  return streak;
}

/* ---------- rendering ---------- */
async function renderAll() {
  document.getElementById('tierEyebrow').textContent = currentTier().label + ' mode';
  document.getElementById('dayNum').textContent = Math.min(state.currentDay, TOTAL_DAYS);

  const failBanner = document.getElementById('failBanner');
  if (state.status === 'failed') {
    failBanner.classList.remove('hidden');
    document.getElementById('failDay').textContent = `Day ${state.failedAtDay}`;
  } else {
    failBanner.classList.add('hidden');
  }

  const streak = await computeStreak();
  document.getElementById('streakNum').textContent = streak;

  await renderChain();
  await renderToday();
  await renderCalendar();
  await renderGallery();
}

async function renderChain() {
  const chain = document.getElementById('chain');
  chain.innerHTML = '';
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const cell = document.createElement('div');
    cell.className = 'chain-cell';
    if (d < state.currentDay || (d === state.currentDay && state.status !== 'active')) {
      const complete = await isDayComplete(d);
      cell.classList.add(complete ? 'done' : 'missed');
    } else if (d === state.currentDay && state.status === 'active') {
      cell.classList.add('today');
    }
    chain.appendChild(cell);
  }
}

async function renderToday() {
  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '';

  if (state.status !== 'active') {
    taskList.innerHTML = state.status === 'completed'
      ? '<p style="color:var(--muted);font-size:14px;">You completed the full run. Start a new one from Settings whenever you\'re ready.</p>'
      : '<p style="color:var(--muted);font-size:14px;">Restart the run to keep logging today\'s tasks.</p>';
    document.querySelector('.photo-card').style.display = 'none';
    return;
  }
  document.querySelector('.photo-card').style.display = '';

  const day = state.currentDay;
  let rec = await DB.getDay(day);
  if (!rec) {
    rec = { day, date: isoDateOnly(new Date()), tasks: emptyTasks(), completed: false };
  }
  state.todayRecord = rec;

  currentTier().tasks.filter((t) => t.id !== 'photo').forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (rec.tasks[task.id] ? ' checked' : '');
    li.dataset.taskId = task.id;
    li.innerHTML = `<span class="task-check">✓</span><span class="task-label">${task.label}</span>`;
    li.addEventListener('click', () => toggleTask(task.id));
    taskList.appendChild(li);
  });

  const photo = await DB.getPhoto(day);
  const preview = document.getElementById('photoPreview');
  const placeholder = document.getElementById('photoPlaceholder');
  const status = document.getElementById('photoStatus');
  if (photo) {
    preview.src = URL.createObjectURL(photo.blob);
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    status.textContent = 'Saved';
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    status.textContent = 'Not taken yet';
  }
}

async function toggleTask(taskId) {
  const day = state.currentDay;
  let rec = await DB.getDay(day);
  if (!rec) rec = { day, date: isoDateOnly(new Date()), tasks: emptyTasks(), completed: false };
  rec.tasks[taskId] = !rec.tasks[taskId];
  await DB.putDay(rec);
  await renderAll();
}

async function handlePhotoUpload(file) {
  const day = state.currentDay;
  await DB.putPhoto(day, file);
  let rec = await DB.getDay(day);
  if (!rec) rec = { day, date: isoDateOnly(new Date()), tasks: emptyTasks(), completed: false };
  await DB.putDay(rec);
  await renderAll();
}

async function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const cell = document.createElement('button');
    cell.className = 'cal-cell';
    cell.textContent = d;
    if (d > state.currentDay || (d === state.currentDay && state.status === 'active')) {
      if (d === state.currentDay) cell.classList.add('today');
      else cell.classList.add('future');
    } else {
      const complete = await isDayComplete(d);
      cell.classList.add(complete ? 'done' : 'missed');
      const photo = await DB.getPhoto(d);
      if (photo) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        cell.appendChild(dot);
      }
    }
    if (d <= state.currentDay) {
      cell.addEventListener('click', () => openDayModal(d));
    }
    grid.appendChild(cell);
  }
}

async function openDayModal(day) {
  const rec = await DB.getDay(day);
  const photo = await DB.getPhoto(day);
  document.getElementById('modalDay').textContent = `Day ${day}`;
  document.getElementById('modalDate').textContent = dateForDay(day).toDateString();

  const modalPhoto = document.getElementById('modalPhoto');
  if (photo) {
    modalPhoto.src = URL.createObjectURL(photo.blob);
    modalPhoto.classList.remove('hidden');
  } else {
    modalPhoto.classList.add('hidden');
  }

  const list = document.getElementById('modalTasks');
  list.innerHTML = '';
  currentTier().tasks.forEach((task) => {
    const li = document.createElement('li');
    let done;
    if (task.id === 'photo') done = !!photo;
    else done = !!(rec && rec.tasks[task.id]);
    li.className = done ? 'done' : 'no';
    li.textContent = task.label;
    list.appendChild(li);
  });

  document.getElementById('dayModal').classList.remove('hidden');
}

async function renderGallery() {
  const photos = await DB.getAllPhotos();
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  grid.innerHTML = '';
  if (photos.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  photos.forEach((p) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(p.blob);
    img.addEventListener('click', () => openDayModal(p.day));
    grid.appendChild(img);
  });
}

/* ---------- tier selection / onboarding ---------- */
function renderTierCards() {
  const wrap = document.getElementById('tierCards');
  wrap.innerHTML = '';
  let selected = null;
  Object.entries(TIERS).forEach(([key, tier]) => {
    const card = document.createElement('button');
    card.className = 'tier-card';
    card.style.setProperty('--tier-color', tier.color);
    card.innerHTML = `
      <div class="tier-card-top">
        <span class="tier-name">${tier.label}</span>
        <span class="tier-dot"></span>
      </div>
      <p class="tier-desc">${tier.desc}</p>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.tier-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selected = key;
      document.getElementById('startBtn').disabled = false;
      document.getElementById('startBtn').dataset.tier = key;
    });
    wrap.appendChild(card);
  });
}

async function startRun(tier) {
  const startDate = isoDateOnly(new Date());
  await DB.setMeta('settings', { tier, startDate, status: 'active' });
  state.tier = tier;
  state.startDate = startDate;
  state.status = 'active';
  state.failedAtDay = null;
  showApp();
}

async function restartRun() {
  await DB.clearAll();
  await startRun(state.tier);
}

async function wipeEverything() {
  await DB.clearAll();
  location.reload();
}

/* ---------- tabs ---------- */
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
}

/* ---------- wire up events ---------- */
window.addEventListener('DOMContentLoaded', () => {
  boot();

  document.getElementById('startBtn').addEventListener('click', (e) => {
    const tier = e.target.dataset.tier;
    if (tier) startRun(tier);
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    if (confirm('This clears all logged days and photos and restarts at Day 1. Continue?')) {
      restartRun();
    }
  });

  document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePhotoUpload(file);
  });

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('dayModal').classList.add('hidden');
  });
  document.getElementById('dayModal').addEventListener('click', (e) => {
    if (e.target.id === 'dayModal') e.target.classList.add('hidden');
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsMeta').textContent =
      `${currentTier().label} mode · started ${dateOnly(state.startDate).toDateString()}`;
    document.getElementById('settingsSheet').classList.remove('hidden');
  });
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsSheet').classList.add('hidden');
  });
  document.getElementById('settingsSheet').addEventListener('click', (e) => {
    if (e.target.id === 'settingsSheet') e.target.classList.add('hidden');
  });
  document.getElementById('switchTierBtn').addEventListener('click', async () => {
    if (confirm('Changing difficulty restarts your run at Day 1 and clears all logged data. Continue?')) {
      await DB.clearAll();
      document.getElementById('settingsSheet').classList.add('hidden');
      showOnboarding();
    }
  });
  document.getElementById('wipeBtn').addEventListener('click', () => {
    if (confirm('This permanently erases every day, task, and photo. Continue?')) {
      wipeEverything();
    }
  });
});
