/* controllers/appController.js — UI wiring and controller for the app */
(function () {
  async function init() {
    await boot();
    const StateManager = window.StateManager;

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

    document.getElementById('settingsBtn').addEventListener('click', async () => {
      const s = StateManager.getState();
      document.getElementById('settingsMeta').textContent =
        `${currentTier().label} mode · started ${dateOnly(s.startDate).toDateString()}`;
      // render the settings task editor if available
      if (window.AppView && typeof window.AppView.renderSettingsTasks === 'function') {
        window.AppView.renderSettingsTasks();
      }
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
        await window.TrackerRepository.clearAll();
        document.getElementById('settingsSheet').classList.add('hidden');
        showOnboarding();
      }
    });
    document.getElementById('wipeBtn').addEventListener('click', () => {
      if (confirm('This permanently erases every day, task, and photo. Continue?')) {
        wipeEverything();
      }
    });
  }

  window.AppController = { init };

  window.addEventListener('DOMContentLoaded', () => { AppController.init(); });
})();
