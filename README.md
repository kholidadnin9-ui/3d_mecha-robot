# MECHA ROBOT ARENA 3D

**Cinematic 3D Robot Fighting Game — Production-Ready Playable Prototype**

Built with **React 19**, **TypeScript**, **Vite**, **Three.js**, **Tailwind CSS**, and **Web Audio API**.

---

## Combatants

1. **GOLDEN GUARDIAN (Playable Hero)**
   - Pearl-white, silver, and royal metallic gold articulated mecha armor with ornate Baroque gold scrollwork filigree, glowing crescent golden visor eyes, heraldic chest shield emblem, and twin vernier jetpack thrusters.
   - **Elemental Arsenal**:
     - **Aegis Strike (`LMB` / `J`)**: 3-hit mechanical combo (`Quick Jab` → `Cross Punch` → `Mechanical Power Kick` with knockback).
     - **Thruster Evade (`SPACE`)**: High-speed directional jet dash/dodge with brief invulnerability frames.
     - **Skill 1 — Electric Lightning (`Q`)**: Summons branching golden-blue 3D lightning bolts that deal AoE electrical damage and **Stun** the boss for `1.25s`.
     - **Skill 2 — Energy Explosion (`E`)**: Unleashes an expanding golden plasma sphere dealing distance-scaled AoE damage and radial **Knockback**.
     - **Skill 3 — Rocket Punch (`R`)**: Detaches Golden Guardian's actual 3D right mechanical fist (exposing the glowing plasma wrist socket), fires a guided rocket projectile that explodes on impact, and recalls back to re-attach.
     - **Ultimate — Divine Thunderstorm (`F`)**: Cinematic sequence that darkens arena lighting, levitates Golden Guardian in a radiant pose, bombards the arena with branching thunderbolts, and finishes with a slow-motion supernova shockwave.

2. **CRIMSON DESTROYER (Boss AI)**
   - Deep crimson, obsidian-black, and burnished gold heavy mecha boss controlled by an 11-state Finite State Machine (`IDLE`, `APPROACH`, `PURSUE`, `COMBAT`, `BASIC_ATTACK`, `SPECIAL_ATTACK`, `DODGE`, `STAGGER`, `KNOCKBACK`, `RETREAT`, `DEFEATED`).
   - Features telegraphed AoE boss attacks (**Hellfire Nova**, **Crimson Thunder**, and **Blitz Strike**) and 3 selectable difficulty tiers (`NORMAL`, `HARD`, `BOSS`).

---

## Controls

### Desktop (Keyboard & Mouse)
| Input | Action |
| --- | --- |
| `W` / `A` / `S` / `D` or Arrow Keys | Movement |
| `Shift` (Hold) | Sprint / Thruster Run |
| `Left Mouse Click` or `J` | Basic Attack (3-Hit Combo) |
| `Q` | Skill 1 — Electric Lightning |
| `E` | Skill 2 — Energy Explosion |
| `R` | Skill 3 — Rocket Punch |
| `F` | Ultimate — Divine Thunderstorm |
| `Space` | Dash / Evade |
| `K` or `C` | Jump |
| `Mouse Drag` / `Scroll Wheel` | Orbit & Zoom Battle Camera |
| `Escape` | Pause / Tactical Settings |

### Mobile & Touchscreen
- **Bottom-Left Virtual Joystick**: Smooth 360° directional movement (push past 72% radius to Sprint).
- **Bottom-Right MOBA Ability Cluster**: Ergonomic radial arc with Basic Strike, Dash, Jump, Skills 1–3, and Ultimate with live radial cooldown timers & energy indicators.
- **Upper/Center Touch Drag**: Rotate battle camera smoothly.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Create production build
npm run build

# 4. Preview production build locally
npm run preview
```

---

## Replacing Procedural Models with GLB/GLTF Assets

`src/game/characters/ModelLoader.ts` includes `GLTFLoader` + `AnimationMixer` integration. To swap either procedural character with an external `.glb` file later without modifying combat or AI logic, place `.glb` files in `public/models/` and pass the URL to `ModelLoader.loadOrBuildCharacter(...)`.

---

## GitHub Pages Deployment

This repository includes `.github/workflows/deploy.yml` for automatic deployment to GitHub Pages:

1. Push this project to a GitHub repository (`main` or `master` branch).
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push a commit or trigger **Deploy Mecha Robot Arena 3D to GitHub Pages** from the **Actions** tab.
5. The workflow automatically detects your repository subpath (`steps.pages.outputs.base_path`), builds `dist/`, and publishes your playable 3D game URL.
