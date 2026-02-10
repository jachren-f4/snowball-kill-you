# Snowball Kill You

Katamari Damacy-style 3D browser game. Roll a growing snowball through a park, collecting items smaller than you and stumbling over larger ones.

**Live:** https://elitegamedevelopers.com
**Repo:** https://github.com/jachren-f4/snowball-kill-you

## Tech Stack

- **Three.js** (0.162) — 3D rendering
- **TypeScript** — strict mode
- **Vite** (5.4) — dev server and bundler
- **GitHub Actions** — CI/CD to GitHub Pages
- **GoDaddy** — DNS for custom domain

## Project Structure

```
src/
  main.ts          — Entry point, creates and starts Game
  Game.ts          — Scene setup, game loop, collision detection, lighting
  Ball.ts          — Snowball physics, rolling, gravity, trail particles, stumble
  Park.ts          — FBX model loading, material recoloring, item placement, environment
  Controls.ts      — Keyboard (WASD/arrows) + mobile touch joystick
  FollowCamera.ts  — Third-person camera, scales with ball size, mobile zoom
  types.ts         — Collectible interface

public/
  CNAME                    — Custom domain config
  models/quaternius/       — ~40 FBX models (trees, rocks, bushes, flora)
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

## Key Constants

- Ball starting radius: 0.5
- Ball speed: 40 units/s, damping: 5
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

Only **Quaternius FBX models** are used (centimeter units, scaled 0.004–0.04):
- Trees: CommonTree, BirchTree, PineTree, Willow (with autumn variants)
- Flora: Flowers, Grass, Plants, Bush, BushBerries
- Terrain: Rock (5 variants + moss), WoodLog, TreeStump, Lilypad

Materials are recolored via name matching in `MATERIAL_COLORS` (Park.ts) because FBX embedded colors are extremely dark (Kd ~0.07-0.12 in linear space).

## Mobile Support

- Device detection: userAgent regex + `ontouchstart` + screen width < 1024
- Virtual joystick: fixed bottom-left, 130px base, 55px max thumb travel
- Touch zone: full-width, bottom 50% of screen
- CSS media queries: `(hover: none) and (pointer: coarse)` for mobile UI
