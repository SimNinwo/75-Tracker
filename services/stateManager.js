/* services/stateManager.js — centralized application state manager
   Provides a single source of truth for app state without leaking globals.
   Usage: const state = StateManager.getState(); // returns the internal state object
*/
(function () {
  const DEFAULT = {
    tier: null,
    startDate: null,
    status: 'active', // active | failed | completed
    currentDay: 1,
    todayRecord: null,
    todayPhotoUrl: null,
    activeTab: 'today',
    failedAtDay: null,
  };

  let _state = { ...DEFAULT };
  const listeners = new Set();

  function getState() { return _state; }
  function setState(next) { _state = next; notify(); }
  function update(fn) { _state = fn(_state) || _state; notify(); }
  function reset() { _state = { ...DEFAULT }; notify(); }
  function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
  function notify() { listeners.forEach((cb) => { try { cb(_state); } catch (e) {} }); }

  window.StateManager = { getState, setState, update, reset, subscribe };
})();
