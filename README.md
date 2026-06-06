# B/X D&D Dungeon Turn Tracker

A lightweight, web-based utility for Dungeon Masters to track time, light sources, movement, and wandering monsters in OSR-style dungeon crawls (specifically optimized for B/X D&D).

![App Version](https://img.shields.io/github/v/release/JustinFreitas/bx-dungeon-turn-tracker-www)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.11-blue)
![License](https://img.shields.io/badge/license-ISC-green)

## ⚔️ Key Features

- **⏱️ Automated Time Tracking**: Converts Turn # into real-time hours/minutes (6 turns = 1 hour).
- **🕯️ Multi-Source Light Tracker**: Track multiple torches and lanterns simultaneously. 
  - **Torches**: 6 turn duration (1 hour).
  - **Lanterns**: 24 turn duration (4 hours).
  - **Proactive Hand-off**: Refreshing a light while one is active banking the full time for future turns.
  - **Holder Labels**: Assign lights to specific characters or hands (e.g., "Grog's Torch").
- **🌙 Ambient Light Toggle**: Separate the room's environment from the party's resources. Visual "NO VISIBILITY" alerts if the room is dark and no light is active.
- **👣 Movement Tracking**: Standard B/X rates (120/40, 90/30, etc.) available as a quick reference/dropdown.
- **🎲 Wandering Monsters**: Automated rolls every X turns at the start of the turn. Manual "Roll Now" button for noisy parties.
- **🍎 Rest & Fatigue**: Tracks turns since last rest. Alerts at Turn 6 and applies a -1 Fatigue Penalty if the party skips their mandatory rest.
- **💾 Save/Restore**: Save named sessions to the server. Includes a "Peek Log" feature to view history before loading.
- **🛡️ Hardened Security**: Built-in protection against hammering (rate limiting), XSS, and payload attacks.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.11 or higher.

### Installation
1. Clone the repository or download the latest release bundle.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
- **Development Mode** (Auto-restarts on save):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
- **PM2 (Recommended for 24/7 Hosting)**:
  ```bash
  npm install pm2 -g
  pm2 start ecosystem.config.js
  ```

Access the tracker at `http://localhost:3000`.

## 🛡️ Admin Key
Saving and Loading requires an **Admin Key**. 
- Default: `dungeon-master`
- To change: Set the `ADMIN_KEY` environment variable on your host.

## 🧪 Running Tests
The core engine is backed by 21 unit tests covering all B/X rules and edge cases.
```bash
npm test
```

## 🛠️ Built With
- **Backend**: Node.js, Express
- **Frontend**: Vanilla JS, Bootstrap 5 (Dark/Light mode support)
- **Security**: Helmet, Express-Rate-Limit, HPP, XSS-Clean
- **Test Suite**: Jest

## 📜 License
This project is licensed under the ISC License.
