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
  return window.AppView.currentTier();
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
  await showApp();
}

function showOnboarding() {
  window.AppView.showOnboarding();
}

async function showApp() {
  await window.AppView.showApp();
}

function applyTierColor() {
  window.AppView.applyTierColor();
}

/* ---------- status / streak logic ---------- */
async function recomputeStatus() {
  return window.TrackerService.recomputeStatus();
}

async function computeStreak() {
  return window.TrackerService.computeStreak();
}

async function startRun(tier) {
  await window.TrackerService.startRun(tier);
  await window.AppView.showApp();
}

async function restartRun() {
  await window.TrackerService.restartRun();
  await window.AppView.showApp();
}

async function wipeEverything() {
  return window.TrackerService.wipeEverything();
}

function handlePhotoUpload(file) {
  return window.AppView.handlePhotoUpload(file);
}

function switchTab(tab) {
  window.AppView.switchTab(tab);
}

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

/* ---------- debug helpers ---------- */
async function debugCheckDay(dayNum = state.currentDay) {
  const rec = await window.TrackerRepository.getDay(dayNum);
  const photo = await window.TrackerRepository.getPhoto(dayNum);
  const isComplete = await isDayComplete(dayNum);
  console.log(`Day ${dayNum}:`, {
    record: rec,
    hasPhoto: !!photo,
    isDayComplete: isComplete,
    recCompleted: rec?.completed || null,
  });
  return { record: rec, hasPhoto: !!photo, isDayComplete: isComplete, recCompleted: rec?.completed };
}
window.debugCheckDay = debugCheckDay;
