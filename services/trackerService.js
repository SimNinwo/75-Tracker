/* services/trackerService.js — business logic / use-cases for the 75-Tracker app */
(function () {
  function getTIERS() { return window.TIERS; }
  function getTOTAL_DAYS() { return window.TOTAL_DAYS; }
  function getDB() { return window.TrackerRepository; }
  function getStateManager() { return window.StateManager; }

  function currentTier() {
    return getTIERS()[getStateManager().getState().tier];
  }

  // Return the effective task list for the current tier, taking into account
  // any user-customized tasks persisted in state.customTasks.
  function effectiveTasks() {
    const s = getStateManager().getState();
    const base = getTIERS()[s.tier].tasks || [];
    const custom = (s.customTasks && s.customTasks[s.tier]);
    if (Array.isArray(custom) && custom.length > 0) return custom;
    return base;
  }

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
    const d = dateOnly(getStateManager().getState().startDate);
    d.setDate(d.getDate() + (dayNum - 1));
    return d;
  }

  function emptyTasks() {
    const t = {};
    effectiveTasks().forEach((task) => { t[task.id] = false; });
    return t;
  }

  async function isDayComplete(dayNum) {
    const rec = await getDB().getDay(dayNum);
    for (const task of effectiveTasks()) {
      if (task.id === 'photo') {
        const photo = await getDB().getPhoto(dayNum);
        if (!photo) return false;
      } else if (!rec || !rec.tasks[task.id]) {
        return false;
      }
    }
    return true;
  }

  async function recomputeStatus() {
    const today = new Date();
    const s = getStateManager().getState();
    const rawDayIndex = daysBetween(s.startDate, today) + 1;
    const dayIndex = Math.min(rawDayIndex, getTOTAL_DAYS() + 1);

    if (s.status === 'active') {
      for (let d = 1; d < dayIndex; d++) {
        const complete = await isDayComplete(d);
        if (!complete) {
          if (currentTier().restartOnMiss) {
            s.status = 'failed';
            s.failedAtDay = d;
            await getDB().setMeta('settings', {
              tier: s.tier, startDate: s.startDate,
              status: 'failed', failedAtDay: d,
            });
            break;
          }
        }
      }
    }

    if (s.status === 'active' && rawDayIndex > getTOTAL_DAYS()) {
      s.status = 'completed';
      await getDB().setMeta('settings', {
        tier: s.tier, startDate: s.startDate, status: 'completed',
      });
    }

    s.currentDay = Math.min(Math.max(rawDayIndex, 1), getTOTAL_DAYS());
  }

  async function computeStreak() {
    const s = getStateManager().getState();
    const upTo = s.status === 'failed' ? s.failedAtDay - 1 : s.currentDay;
    let streak = 0;
    for (let d = upTo; d >= 1; d--) {
      const complete = await isDayComplete(d);
      if (complete) streak++;
      else break;
    }
    return streak;
  }

  async function startRun(tier) {
    const startDate = isoDateOnly(new Date());
    await getDB().setMeta('settings', { tier, startDate, status: 'active' });
    const s = getStateManager().getState();
    s.tier = tier;
    s.startDate = startDate;
    s.status = 'active';
    s.failedAtDay = null;
  }

  async function restartRun() {
    await getDB().clearAll();
    await startRun(getStateManager().getState().tier);
  }

  async function wipeEverything() {
    await getDB().clearAll();
    location.reload();
  }

  // expose service
  window.TrackerService = {
    dateOnly,
    isoDateOnly,
    daysBetween,
    dateForDay,
    emptyTasks,
    isDayComplete,
    recomputeStatus,
    computeStreak,
    startRun,
    restartRun,
    wipeEverything,
  };
})();
