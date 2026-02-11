# Snowball Kill You

Katamari Damacy-style 3D browser game. Roll a growing snowball through a park, collecting items smaller than you and stumbling over larger ones.

**Live:** https://elitegamedevelopers.com
**Repo:** https://github.com/jachren-f4/snowball-kill-you

## Tech Stack

- **Three.js** (0.162) — 3D rendering
- **Trystero** — P2P WebRTC multiplayer (Nostr signaling, no server)
- **TypeScript** — strict mode
- **Vite** (5.4) — dev server and bundler
- **GitHub Actions** — CI/CD to GitHub Pages
- **GoDaddy** — DNS for custom domain

## Project Structure

```
src/
  main.ts          — Entry point, creates and starts Game
  Game.ts          — Scene setup, game loop, collision detection, lighting, multiplayer integration
  Ball.ts          — Snowball physics, rolling, gravity, trail particles, stumble, speed scaling
  Park.ts          — Flat park level (legacy, not currently used — HillLevel.ts is active)
  HillLevel.ts     — Hill terrain level with Gaussian bumps, item/NPC placement at terrain height
  Terrain.ts       — Procedural terrain mesh with vertex colors (grass→snow gradient)
  models.ts        — FBX/GLB model loading, material recoloring, NPC loading, placement helpers
  NPC.ts           — Brainrot NPC characters: wandering AI, smooth turning, waddle animation, network sync
  Network.ts       — Trystero P2P WebRTC wrapper: room management, ball/collect/NPC/start channels
  RemoteBall.ts    — Visual-only remote player snowball with lerp interpolation
  Controls.ts      — Keyboard (WASD/arrows) + mobile touch joystick
  FollowCamera.ts  — Third-person camera, scales with ball size, mobile zoom
  types.ts         — Collectible, NPCConfig, GroundQuery interfaces

public/
  CNAME                    — Custom domain config
  models/quaternius/       — ~40 FBX models (trees, rocks, bushes, flora)
  models/brainrot/         — Italian brainrot character models (GLB/FBX + textures)
  models/brainrot/originals/ — Full-res original textures (gitignored, local backup)
  models/nature/           — Kenney GLB nature kit (unused, kept for reference)
  models/furniture/        — Kenney GLB furniture kit (unused, kept for reference)

.github/workflows/
  deploy.yml       — Build and deploy to GitHub Pages on push to main
```

## Architecture

- No physics engine — manual kinematics with velocity, damping, gravity
- Collision: sphere-sphere between ball and collectibles
  - Item size < ball radius × 1.5 → collect and attach to ball
  - Item size >= threshold → stumble (bounce back or hop over based on size ratio)
- Camera-relative controls: input direction transformed by camera's world direction
- FBX models use embedded materials with very dark colors — `brightenMaterials()` remaps by material name using `MATERIAL_COLORS` dictionary
- NPC system: GLB/FBX loading with texture application, auto-scale calibration, wandering AI with smooth turning, waddle animation with turn-wobble
- Multiplayer: P2P via Trystero WebRTC, host/guest roles, ball state synced every frame, NPC state at 10fps from host. See `docs/features/multiplayer.md` for full details
  - DO NOT sync camera, controls, trail particles, or wobble — these are player-local
  - NPC network sync MUST include Y position (terrain height) or guest NPCs clip through hills
  - `#multiplayer-ui` CSS is `display:none` — must set `style.display='block'` not `''` to show it

## Key Constants

- Ball starting radius: 0.5
- Ball base speed: 40 units/s, damping: 5 (speed scales with √growth at 50% compensation)
- Gravity: -25
- Park bounds: ±48 units
- Growth per item: `itemSize × 0.08`
- Snow trail: max 80 particles, 2-3.5s lifetime
- Mobile camera: 1.5× distance, 1.4× height

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript check + Vite build to dist/
npm run preview      # Preview production build
```

## Deployment

Push to `main` triggers GitHub Actions:
1. Checkout → Node 22 → `rm -f package-lock.json && npm install`
2. `npx vite build --base=/`
3. Upload dist/ → Deploy to GitHub Pages

The `rm -f package-lock.json` step is needed because CI generates a fresh lockfile to avoid platform-specific rollup dependency issues.

## 3D Models

**Quaternius FBX models** (centimeter units, scaled 0.004–0.04):
- Trees: CommonTree, BirchTree, PineTree, Willow (with autumn variants)
- Flora: Flowers, Grass, Plants, Bush, BushBerries
- Terrain: Rock (5 variants + moss), WoodLog, TreeStump, Lilypad

Materials are recolored via name matching in `MATERIAL_COLORS` (Park.ts) because FBX embedded colors are extremely dark (Kd ~0.07-0.12 in linear space).

**Italian Brainrot NPCs** (wandering characters, collectible/stumble-able):
- Capuchino Assassino — GLB, size 1.5, 2 spawns
- Tralalero Tralala — FBX + 1024px base color texture, size 2.5, 2 spawns
- La Vaca Saturno — FBX + 1024px base color texture, size 3.5, 1 spawn

NPCs wander randomly (retarget every 3-7s), smooth-turn with lerp (rate 4/s), and have a plushy waddle animation (bounce + side rock + forward tilt) that amplifies during sharp turns. Auto-scaled at load time to match target size. Original full-res textures backed up in `originals/` (gitignored).

## Mobile Support

- Device detection: userAgent regex + `ontouchstart` + screen width < 1024
- Virtual joystick: fixed bottom-left, 130px base, 55px max thumb travel
- Touch zone: full-width, bottom 50% of screen
- CSS media queries: `(hover: none) and (pointer: coarse)` for mobile UI
