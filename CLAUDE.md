# Katamari Clone — Project Guide

## Overview

Katamari Damacy-inspired 3D rolling game. Three.js + Rapier physics, wrapped with Capacitor for app store distribution.

## Tech Stack

- **Rendering:** Three.js
- **Physics:** Rapier (`@dimforge/rapier3d`)
- **Language:** TypeScript
- **Bundler:** Vite
- **Native Wrapper:** Capacitor (iOS + Android)

## Project Structure

```
katamari_clone/
├── docs/              # Documentation
├── src/
│   ├── main.ts        # Entry point
│   ├── game/          # Core game logic
│   ├── physics/       # Rapier physics setup and helpers
│   ├── rendering/     # Three.js scene, camera, lighting
│   ├── input/         # Touch and keyboard input handling
│   └── ui/            # HUD and menu overlays
├── public/            # Static assets (models, textures, sounds)
├── ios/               # Capacitor iOS project (generated)
├── android/           # Capacitor Android project (generated)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Key Commands

```bash
# Dev
npm install
npm run dev              # Start Vite dev server

# Build
npm run build            # Production build to dist/

# Capacitor (after build)
npx cap sync             # Sync web build to native projects
npx cap open ios         # Open Xcode project
npx cap open android     # Open Android Studio project
```

## Development Notes

- Build as a web app first, add Capacitor later
- Test in browser during development, mobile devices for touch/performance
- Rapier runs in WASM — must await initialization before starting physics
- Three.js render loop and Rapier physics step run in the same requestAnimationFrame loop
- Touch controls: virtual joystick or swipe-based directional input
