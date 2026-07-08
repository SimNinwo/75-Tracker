/* trackerService.js — business logic / use-cases for the 75-Tracker app
   Purpose: isolate date logic, completion rules and DB interactions from UI.
   This is a minimal refactor that keeps browser globals but separates concerns.
*/
(function () {
  const DB = window.TrackerRepository;
  const TOTAL_DAYS = window.TOTAL_DAYS;
  const TIERS = window.TIERS;

  function currentTier() {
    return TIERS[window.state.tier];
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
    const d = dateOnly(window.state.startDate);
    d.setDate(d.getDate() + (dayNum - 1));
    return d;
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

  async function recomputeStatus() {
    const today = new Date();
    const rawDayIndex = daysBetween(window.state.startDate, today) + 1;
    const dayIndex = Math.min(rawDayIndex, TOTAL_DAYS + 1);

    if (window.state.status === 'active') {
      for (let d = 1; d < dayIndex; d++) {
        const complete = await isDayComplete(d);
        if (!complete) {
          if (currentTier().restartOnMiss) {
            window.state.status = 'failed';
            window.state.failedAtDay = d;
            await DB.setMeta('settings', {
              tier: window.state.tier, startDate: window.state.startDate,
              status: 'failed', failedAtDay: d,
            });
            break;
          }
        }
      }
    }

    if (window.state.status === 'active' && rawDayIndex > TOTAL_DAYS) {
      window.state.status = 'completed';
      await DB.setMeta('settings', {
        tier: window.state.tier, startDate: window.state.startDate, status: 'completed',
      });
    }

    window.state.currentDay = Math.min(Math.max(rawDayIndex, 1), TOTAL_DAYS);
  }

  async function computeStreak() {
    const upTo = window.state.status === 'failed' ? window.state.failedAtDay - 1 : window.state.currentDay;
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
    await DB.setMeta('settings', { tier, startDate, status: 'active' });
    window.state.tier = tier;
    window.state.startDate = startDate;
    window.state.status = 'active';
    window.state.failedAtDay = null;
  }

  async function restartRun() {
    await DB.clearAll();
    await startRun(window.state.tier);
  }

  async function wipeEverything() {
    await DB.clearAll();
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
