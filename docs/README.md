# Katamari Clone

A Katamari Damacy-inspired 3D rolling game built for mobile, distributed through app stores.

## Concept

Roll a sticky ball around environments, picking up objects. As the ball grows, progressively larger objects become collectible. The core loop: roll, collect, grow, repeat.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| 3D Rendering | Three.js | Mature scene graph, large ecosystem, well-documented |
| Physics | Rapier (`@dimforge/rapier3d`) | Fast WASM-based physics, modern API |
| Bundler | Vite | Fast dev server, good production builds |
| Native Wrapper | Capacitor | Wraps web app for App Store / Google Play distribution |
| Language | TypeScript | Type safety for game logic |

## Architecture

```
Browser/WebView
├── Three.js (rendering)
│   ├── Scene graph
│   ├── Camera (third-person follow)
│   ├── Lighting
│   └── Object meshes
├── Rapier (physics)
│   ├── Ball rigid body
│   ├── World objects (static/dynamic)
│   └── Collision detection
├── Game Logic
│   ├── Size comparison (can we pick this up?)
│   ├── Object attachment (parent to ball mesh)
│   ├── Growth tracking (update radius)
│   └── Level progression
└── Input
    ├── Touch controls (mobile)
    └── Keyboard (desktop/debug)
```

## Core Mechanics

1. **Rolling** — Apply forces to a physics sphere based on input direction
2. **Collision detection** — Rapier detects contact between ball and world objects
3. **Size check** — Compare ball radius to object size; if big enough, attach it
4. **Attachment** — Remove object from physics world, parent its mesh to the ball
5. **Growth** — Increase ball radius based on collected object volume
6. **Camera** — Third-person camera follows the ball, adjusts distance as it grows

## Distribution

- **Web** — Deploy as a website (primary development target)
- **PWA** — Progressive Web App for installable browser experience
- **iOS** — Capacitor build, distribute via App Store
- **Android** — Capacitor build, distribute via Google Play

## Development Phases

- [ ] Phase 1: Project setup (Vite + Three.js + Rapier + TypeScript)
- [ ] Phase 2: Ball rolling with physics and camera
- [ ] Phase 3: Collectible objects and attachment mechanic
- [ ] Phase 4: Growth system and size-gating
- [ ] Phase 5: Level design and object variety
- [ ] Phase 6: Touch controls and mobile optimization
- [ ] Phase 7: Capacitor integration and app store builds
- [ ] Phase 8: Polish (UI, sound, visual effects)
