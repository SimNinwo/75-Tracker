# 75-Tracker

A progressive web app for tracking daily challenges across 75 days. Choose your difficulty level (Hard, Medium, or Easy) and log your daily progress with tasks and photos.

## Features

- 📱 **Progressive Web App** — Install on any device, works offline
- 🎯 **Three Difficulty Tiers** — Hard (75 Hard challenge), Medium, and Easy modes
- ✅ **Daily Task Tracking** — Check off tasks as you complete them
- 📸 **Photo Logging** — Take and store daily progress photos
- 📊 **Progress Visualization** — Chain view, calendar grid, and photo gallery
- 💾 **Persistent Storage** — All data saved to IndexedDB
- ⚡ **Service Worker Caching** — Offline-first architecture
- 🔄 **Automatic Updates** — Smart service worker update detection

## Project Structure

```
75-Tracker/
├── index.html              # Main HTML markup
├── app.js                  # App orchestration and entry point
├── db.js                   # IndexedDB wrapper
├── styles.css              # Styling
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
│
├── services/
│   ├── stateManager.js     # Centralized app state
│   └── trackerService.js   # Business logic & domain rules
│
├── repositories/
│   └── trackerRepository.js # Data access layer
│
├── controllers/
│   └── appController.js    # UI event wiring
│
├── views/
│   └── appView.js          # Rendering & presentation
│
├── tests/
│   └── e2e/
│       ├── run.js          # E2E test harness
│       ├── server.js       # Local test server
│
└── icons/                  # App icons
```

## Architecture

The app follows **clean architecture** principles with clear separation of concerns:

- **Services** — Business logic, date calculations, status computation
- **Repositories** — Data access abstraction over IndexedDB
- **Controllers** — DOM event wiring and user interaction handling
- **Views** — UI rendering logic (chain, calendar, gallery, modals)
- **StateManager** — Centralized, reactive app state

## Setup

### Prerequisites
- Node.js 14+
- npm

### Installation

```bash
npm install
```

## Running the App

Serve the app on `localhost:8000` (or any static server):

```bash
# Using Python
python -m http.server 8000

# Using Node (with http-server)
npx http-server
```

Then visit `http://localhost:8000` in your browser.

### Progressive Web App Installation

Once served over HTTPS (or localhost), the install prompt will appear. Click to install the app on your home screen.

## Running Tests

### E2E Tests

```bash
npm run e2e
```

This launches Playwright to run automated end-to-end tests covering:
- Tier selection and run startup
- Task completion tracking
- Photo upload
- Calendar and chain rendering
- Tab navigation

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: IndexedDB (via custom `db.js` wrapper)
- **Offline**: Service Worker with cache-first strategy
- **Testing**: Playwright (E2E)
- **Build**: No build step — runs in browser directly

## Difficulty Tiers

### Hard (75 Hard Classic)
- 2 × 45-min workouts (one outdoors)
- Strict diet (zero cheat meals, alcohol)
- 1 gallon (3.7L) water daily
- 10 pages reading
- Daily progress photo
- **Penalty**: Miss any task → restart at Day 1

### Medium
- 1 × 45-min workout
- Flexible diet (one planned cheat meal/week)
- 3L water daily
- 10 pages reading
- Daily progress photo
- **Penalty**: Miss a day → restart at Day 1

### Easy
- 1 × 30-min workout or walk
- Mindful eating (skip processed junk)
- 2L water daily
- 10 min reading or listening
- Daily progress photo
- **Penalty**: Miss a day is logged but run continues

## Data Model

### Settings (stored in IndexedDB)
```javascript
{
  tier: 'hard' | 'medium' | 'easy',
  startDate: '2024-07-08',
  status: 'active' | 'completed' | 'failed',
  failedAtDay: null | number
}
```

### Day Record
```javascript
{
  day: 1,
  date: '2024-07-08',
  tasks: {
    diet: true,
    workout1: true,
    workout2: false,
    water: true,
    read: true,
    photo: false
  },
  completed: false
}
```

### Photo
```javascript
{
  day: 1,
  blob: Blob,
  timestamp: number
}
```

## Service Worker Updates

The app implements smart service worker updates:
- Detects when a new SW is waiting
- Reloads the page when a new SW takes control
- Caches all assets for offline use
- Auto-cleans old cache versions

## Development Notes

### State Management
All app state is managed through `StateManager.getState()`, which provides:
- Current day number
- Tier selection
- Run status (active/completed/failed)
- Failed day (if applicable)
- Active tab

### Adding New Features

1. **Business Logic** → Add to `services/trackerService.js`
2. **Data Access** → Add to `repositories/trackerRepository.js`
3. **UI Rendering** → Add method to `views/appView.js`
4. **Event Handling** → Add listener in `controllers/appController.js`
5. **Tests** → Add E2E test to `tests/e2e/run.js`

## Browser Support

- Chrome/Edge 87+
- Firefox 85+
- Safari 14+
- Requires Service Worker support

## License

MIT

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Version**: 1.2  
**Last Updated**: July 2026
