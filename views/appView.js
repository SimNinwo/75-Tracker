/* views/appView.js — UI rendering and presentation for the 75-Tracker app */
(function () {
  class AppView {
    constructor() {
      this.state = window.StateManager.getState();
    }

    currentTier() {
      return window.TIERS[this.state.tier];
    }

    // Return the effective task list for the current tier, honoring any
    // user-customized tasks stored in state.customTasks (overrides defaults).
    getTaskList() {
      const base = this.currentTier().tasks || [];
      const custom = (this.state.customTasks && this.state.customTasks[this.state.tier]);
      if (Array.isArray(custom) && custom.length > 0) return custom;
      return base;
    }

    hexToRgba(hex, a) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    async renderAll() {
      document.getElementById('tierEyebrow').textContent = this.currentTier().label + ' mode';
      document.getElementById('dayNum').textContent = Math.min(this.state.currentDay, window.TOTAL_DAYS);

      const failBanner = document.getElementById('failBanner');
      if (this.state.status === 'failed') {
        failBanner.classList.remove('hidden');
        document.getElementById('failDay').textContent = `Day ${this.state.failedAtDay}`;
      } else {
        failBanner.classList.add('hidden');
      }

      const streak = await window.TrackerService.computeStreak();
      document.getElementById('streakNum').textContent = streak;

      await this.renderChain();
      await this.renderToday();
      await this.renderCalendar();
      await this.renderGallery();
    }

    async renderChain() {
      const chain = document.getElementById('chain');
      chain.innerHTML = '';

      for (let d = 1; d <= window.TOTAL_DAYS; d++) {
        const cell = document.createElement('div');
        cell.className = 'chain-cell';
        const isToday = d === this.state.currentDay && this.state.status === 'active';
        const complete = await window.TrackerService.isDayComplete(d);

        if (d < this.state.currentDay || (d === this.state.currentDay && this.state.status !== 'active')) {
          cell.classList.add(complete ? 'done' : 'missed');
          if (complete) {
            const rec = await window.TrackerRepository.getDay(d);
            if (rec && rec.completed) {
              cell.classList.add('completed-badge');
              cell.setAttribute('title', 'All tasks & photo completed');
            }
          }
        } else if (isToday && complete) {
          cell.classList.add('done');
          const rec = await window.TrackerRepository.getDay(d);
          if (rec && rec.completed) {
            cell.classList.add('completed-badge');
            cell.setAttribute('title', 'All tasks & photo completed');
          }
        } else if (isToday) {
          cell.classList.add('today');
        }

        chain.appendChild(cell);
      }
    }

    async renderToday() {
      const taskList = document.getElementById('taskList');
      taskList.innerHTML = '';

      if (this.state.status !== 'active') {
        taskList.innerHTML = this.state.status === 'completed'
          ? '<p style="color:var(--muted);font-size:14px;">You completed the full run. Start a new one from Settings whenever you\'re ready.</p>'
          : '<p style="color:var(--muted);font-size:14px;">Restart the run to keep logging today\'s tasks.</p>';
        document.querySelector('.photo-card').style.display = 'none';
        return;
      }

      document.querySelector('.photo-card').style.display = '';
      const day = this.state.currentDay;
      let rec = await DB.getDay(day);
      if (!rec) {
        rec = { day, date: window.TrackerService.isoDateOnly(new Date()), tasks: window.TrackerService.emptyTasks(), completed: false };
      }
      this.state.todayRecord = rec;

      this.getTaskList().filter((t) => t.id !== 'photo').forEach((task) => {
        const li = document.createElement('li');
        li.className = 'task-item' + (rec.tasks[task.id] ? ' checked' : '');
        li.dataset.taskId = task.id;
        li.innerHTML = `<span class="task-check">✓</span><span class="task-label">${task.label}</span>`;
        li.addEventListener('click', () => this.toggleTask(task.id));
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

    async toggleTask(taskId) {
      const day = this.state.currentDay;
      let rec = await DB.getDay(day);
      if (!rec) rec = { day, date: window.TrackerService.isoDateOnly(new Date()), tasks: window.TrackerService.emptyTasks(), completed: false };
      rec.tasks[taskId] = !rec.tasks[taskId];
      await DB.putDay(rec);

      const completed = await window.TrackerService.isDayComplete(day);
      if (rec.completed !== completed) {
        rec.completed = completed;
        await DB.putDay(rec);
      }
      await this.renderAll();
    }

    async handlePhotoUpload(file) {
      const day = this.state.currentDay;
      await DB.putPhoto(day, file);
      let rec = await DB.getDay(day);
      if (!rec) rec = { day, date: window.TrackerService.isoDateOnly(new Date()), tasks: window.TrackerService.emptyTasks(), completed: false };
      rec.completed = await window.TrackerService.isDayComplete(day);
      await DB.putDay(rec);
      await this.renderAll();
    }

    async renderCalendar() {
      const grid = document.getElementById('calendarGrid');
      grid.innerHTML = '';

      for (let d = 1; d <= window.TOTAL_DAYS; d++) {
        const cell = document.createElement('button');
        cell.className = 'cal-cell';
        cell.textContent = d;
        const isToday = d === this.state.currentDay && this.state.status === 'active';
        const complete = await window.TrackerService.isDayComplete(d);

        if (d > this.state.currentDay || (isToday && !complete)) {
          if (d === this.state.currentDay) cell.classList.add('today');
          else cell.classList.add('future');
        } else {
          cell.classList.add(complete ? 'done' : 'missed');
          const photo = await window.TrackerRepository.getPhoto(d);
          if (photo) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            cell.appendChild(dot);
          }
        }

        if (d <= this.state.currentDay) {
          cell.addEventListener('click', () => this.openDayModal(d));
        }
        grid.appendChild(cell);
      }
    }

    async openDayModal(day) {
      const rec = await DB.getDay(day);
      const photo = await DB.getPhoto(day);
      document.getElementById('modalDay').textContent = `Day ${day}`;
      document.getElementById('modalDate').textContent = window.TrackerService.dateForDay(day).toDateString();

      const modalPhoto = document.getElementById('modalPhoto');
      if (photo) {
        modalPhoto.src = URL.createObjectURL(photo.blob);
        modalPhoto.classList.remove('hidden');
      } else {
        modalPhoto.classList.add('hidden');
      }

      const list = document.getElementById('modalTasks');
      list.innerHTML = '';
      this.getTaskList().forEach((task) => {
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

    async renderGallery() {
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
        img.addEventListener('click', () => this.openDayModal(p.day));
        grid.appendChild(img);
      });
    }

    renderTierCards() {
      const wrap = document.getElementById('tierCards');
      wrap.innerHTML = '';
      let selected = null;

      Object.entries(window.TIERS).forEach(([key, tier]) => {
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

    // Render the tasks editor inside Settings. Allows adding/removing up to 7 tasks (photo excluded).
    renderSettingsTasks() {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div style="margin:12px 0">
          <strong>Customize tasks</strong>
          <div id="settingsTasksList" style="margin-top:8px"></div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <input id="settingsTaskInput" placeholder="New task label" style="flex:1;padding:6px" />
            <button id="addSettingsTask" class="btn-primary">Add</button>
          </div>
          <p style="font-size:12px;color:var(--muted);margin-top:8px">You may create up to 7 tasks (photo excluded). For yearly mode, you may replace defaults.</p>
        </div>
      `;
      const container = document.getElementById('settingsSheet').querySelector('.modal-card');
      // remove existing custom section if present
      const existing = document.getElementById('settingsTasks');
      if (existing) existing.remove();
      const holder = document.createElement('div');
      holder.id = 'settingsTasks';
      holder.appendChild(wrap);
      container.insertBefore(holder, container.querySelector('#switchTierBtn'));

      const listEl = holder.querySelector('#settingsTasksList');

      const tasks = this.getTaskList().filter((t) => t.id !== 'photo');
      function renderList() {
        listEl.innerHTML = '';
        tasks.forEach((t, i) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.padding = '6px 0';
          row.innerHTML = `<span>${t.label}</span>`;
          const del = document.createElement('button');
          del.textContent = 'Remove';
          del.className = 'btn-secondary';
          del.addEventListener('click', async () => {
            // remove by updating state.customTasks for this tier
            const s = window.StateManager.getState();
            s.customTasks = s.customTasks || {};
            const current = s.customTasks[s.tier] ? s.customTasks[s.tier].slice() : this.getTaskList().slice();
            current.splice(i, 1);
            s.customTasks[s.tier] = current;
            await window.TrackerRepository.setMeta('customTasks', s.customTasks);
            this.state.customTasks = s.customTasks;
            renderList.call(this);
            await this.renderAll();
          });
          row.appendChild(del);
          listEl.appendChild(row);
        });
      }

      const addBtn = holder.querySelector('#addSettingsTask');
      const input = holder.querySelector('#settingsTaskInput');
      addBtn.addEventListener('click', async () => {
        const label = input.value && input.value.trim();
        if (!label) return;
        const s = window.StateManager.getState();
        s.customTasks = s.customTasks || {};
        const current = s.customTasks[s.tier] ? s.customTasks[s.tier].slice() : this.getTaskList().filter((t) => t.id !== 'photo').slice();
        if (current.length >= 7) {
          alert('Maximum of 7 tasks (photo excluded) reached');
          return;
        }
        // generate a simple id
        const id = 'custom_' + Date.now();
        current.push({ id, label });
        // ensure photo stays present
        s.customTasks[s.tier] = current.concat([{ id: 'photo', label: 'Take a progress photo' }]);
        await window.TrackerRepository.setMeta('customTasks', s.customTasks);
        this.state.customTasks = s.customTasks;
        input.value = '';
        renderList.call(this);
        await this.renderAll();
      });

      renderList.call(this);
    }

    async startRun(tier) {
      await window.TrackerService.startRun(tier);
      this.showApp();
    }

    async restartRun() {
      await window.TrackerService.restartRun();
      this.showApp();
    }

    async wipeEverything() {
      await window.TrackerService.wipeEverything();
    }

    switchTab(tab) {
      this.state.activeTab = tab;
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      document.getElementById('tab-' + tab).classList.remove('hidden');
      document.querySelectorAll('.nav-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
    }

    showOnboarding() {
      document.getElementById('onboard').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      this.renderTierCards();
    }

    applyTierColor() {
      document.documentElement.style.setProperty('--accent', this.currentTier().color);
      document.documentElement.style.setProperty('--accent-soft', this.hexToRgba(this.currentTier().color, 0.16));
    }

    async showApp() {
      document.getElementById('onboard').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      this.applyTierColor();
      await this.renderAll();
    }
  }

  window.AppView = new AppView();
})();
