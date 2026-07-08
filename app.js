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

// Expose to window for services to access
window.TOTAL_DAYS = TOTAL_DAYS;
window.TIERS = TIERS;

const StateManager = window.StateManager;
const state = StateManager.getState();

/* ---------- date helpers ---------- */
function dateOnly(d) {
  return window.TrackerService.dateOnly(d);
}
function isoDateOnly(d) {
  return window.TrackerService.isoDateOnly(d);
}
function daysBetween(a, b) {
  return window.TrackerService.daysBetween(a, b);
}
function dateForDay(dayNum) {
  return window.TrackerService.dateForDay(dayNum);
}

function currentTier() {
  return TIERS[state.tier];
}

function emptyTasks() {
  return window.TrackerService.emptyTasks();
}

async function isDayComplete(dayNum) {
  return window.TrackerService.isDayComplete(dayNum);
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
  return window.TrackerService.recomputeStatus();
}

async function computeStreak() {
  return window.TrackerService.computeStreak();
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
  // save the updated tasks first
  await DB.putDay(rec);
  // recompute completion (photo check is async) and persist if changed
  const completed = await isDayComplete(day);
  if (rec.completed !== completed) {
    rec.completed = completed;
    await DB.putDay(rec);
  }
  await renderAll();
}

async function handlePhotoUpload(file) {
  const day = state.currentDay;
  await DB.putPhoto(day, file);
  let rec = await DB.getDay(day);
  if (!rec) rec = { day, date: isoDateOnly(new Date()), tasks: emptyTasks(), completed: false };
  // after saving the photo, compute whether the day is now complete
  rec.completed = await isDayComplete(day);
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
  await window.TrackerService.startRun(tier);
  showApp();
}

async function restartRun() {
  await window.TrackerService.restartRun();
  showApp();
}

async function wipeEverything() {
  await window.TrackerService.wipeEverything();
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
/* UI wiring moved to `controllers/appController.js` (AppController.init) */

/* ---------- test helpers (dev only) ---------- */
// Simulate marking all tasks and adding a photo for a day, then log results.
// Use from the browser console: `await runCompletionTest(day)`
async function runCompletionTest(day = state.currentDay) {
  // ensure there's a base record
  const base = { day, date: isoDateOnly(new Date()), tasks: emptyTasks(), completed: false };
  await DB.putDay(base);

  // mark all non-photo tasks as done
  const tierTasks = currentTier().tasks.map((t) => t.id);
  let rec = await DB.getDay(day);
  tierTasks.forEach((id) => {
    if (id !== 'photo') rec.tasks[id] = true;
  });
  await DB.putDay(rec);
  console.log('After marking tasks, isDayComplete:', await isDayComplete(day));

  // add a tiny fake blob as the photo
  const blob = new Blob(['fake-photo'], { type: 'image/png' });
  await DB.putPhoto(day, blob);

  // recompute completion and persist
  rec = await DB.getDay(day);
  rec.completed = await isDayComplete(day);
  await DB.putDay(rec);

  console.log('After adding photo, isDayComplete:', await isDayComplete(day), 'rec.completed:', rec.completed);
  return { day, completed: rec.completed };
}

window.runCompletionTest = runCompletionTest;
