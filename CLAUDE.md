# CLAUDE.md — Frosty Spider

> Context for AI assistants and Vibe Academy builders. Read this first.

## This Is a Birb Labs Artefact

Frosty Spider is a **breakable toy** — a real, shipped, playable spider solitaire that also serves as a learning artefact inside Vibe Academy. It exists so people can inspect real code, run it, break it, rebuild it, and learn from it.

**Play it:** (Vercel deployment)
**Repo:** `Mentis123/FrostySpider`
**Ecosystem:** Part of the Vibe ecosystem (vibeacademy.com.au)

### Sibling artefacts (Birb Labs showcase)

One of three showcase artefacts for Birb Labs inside Vibe Academy. All three share the same two-stage splash flow: primary splash → Vibe Academy attribution → game.

1. **Birb Mobile** — birbmobile.vercel.app (3D flight)
2. **Rogue Mobile** — roguemobile.vercel.app (turn-based roguelike)
3. **Frosty Spider** — (this repo, spider solitaire)

All three link their Vibe Academy CTA to `https://www.vibeacademy.com.au/`. Never `atmanacademy.io` — that domain is retired.

## Who Made This

**Mentis** (Adam Rappaport) — call him Mentis, not Adam.

## House Rules

1. **Never test locally** — push to git, Vercel auto-deploys
2. **Mobile-first** — touch devices are primary, desktop is for testing only
3. **Straight to main** — no staging branches

## What This Is

Spider Solitaire implementation. Next.js 16 + React 19 + TypeScript + Tailwind v4. Haptic + audio feedback, animated stack completion, compressed-run view, settings modal, win modal. Vitest covers the game engine; GitHub Actions CI runs typecheck/lint/test/build on every push and PR.

## Source Layout

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Entry point — wraps `<Game>` in `<GameProvider>` |
| `src/app/layout.tsx` | Root HTML shell + PWA metadata |
| `src/lib/types.ts` | Card / game state / settings types |
| `src/lib/gameEngine.ts` | Pure game logic — deals, moves, completion, win/stuck detection, seeded shuffles |
| `src/lib/__tests__/gameEngine.test.ts` | Vitest suite for the engine (`npm test`) |
| `src/lib/layoutCalculator.ts` | Card sizing, stack offsets, run-compression layout math |
| `src/lib/feedback.ts` | Audio + haptic feedback helpers, background music |
| `src/components/Game.tsx` | Top-level state orchestration — splash stages, modals, feedback |
| `src/components/GameBoard.tsx` | Card grid rendering + drag/drop |
| `src/components/Card.tsx` | Single card rendering (+ EmptySlot, StockPile, CompletedPile) |
| `src/components/ControlBar.tsx` | Bottom action bar |
| `src/components/SplashScreen.tsx` | Primary image splash (tap-to-dismiss, session-gated) |
| `src/components/SecondarySplashScreen.tsx` | **Active** Vibe Academy attribution splash — used by `Game.tsx` |
| `VIBE_ACADEMY_SPLASH_TEMPLATE.tsx` | Repo-root reusable template other projects can copy |
| `src/components/SettingsModal.tsx` | Settings |
| `src/components/WinModal.tsx` | Victory screen |
| `src/components/StackCompleteAnimation.tsx` | Run-completion flourish |
| `src/components/CompressedRun.tsx` | Compact completed run display |
| `src/components/FrostySpider.tsx` | SVG mascot — not rendered in the UI; source of the app icon design |
| `src/contexts/GameContext.tsx` | Shared game state + undo/redo + persistence |
| `scripts/generate-assets.mjs` | One-off generator for PWA icons + WebP splash (needs `npm i --no-save sharp`) |

## Splash Flow

```
primary SplashScreen (tap to dismiss — once per session)
  → SecondarySplashScreen (Vibe Academy attribution, tap to continue)
    → game
```

State machine in `Game.tsx`: `splashStage: 'primary' | 'secondary' | null`. Session flag `frosty-spider-splash-shown` gates both stages after first completion.

## Game State

Stable. Vibe Academy splash links migrated from retired `atmanacademy.io` to `https://www.vibeacademy.com.au/` on 2026-04-17.

2026-06-11: full codebase evaluation (`CODEBASE_EVALUATION.md`) implemented in bulk — CI + engine tests added, suit-check engine bug fixed, drag threshold + hit-testing improved, accessibility pass, PWA icons generated, splash compressed to WebP, branding unified to "Frosty Spider", dead code removed (`VibeSplashScreen.tsx`, boilerplate SVGs, old splash images).

## Safe Change Zones

**Safe to edit:**
- Visual styling (Tailwind classes throughout components)
- Audio files and feedback triggers (`src/lib/feedback.ts`)
- Splash image at `public/splash_screen.webp` (regenerate via `scripts/generate-assets.mjs`)
- Card and board styling

**Edit carefully:**
- `GameContext` reducer — touches all game state
- `GameBoard.tsx` drag/drop — gesture handling is delicate on mobile

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`)
- **TypeScript:** strict mode
- **Client components** — mark with `'use client'` at top

## Cross-session hygiene

Mentis works across Claude Code, Claude AI, and Codex. Always pull `origin/main` before starting work — parallel sessions may have shipped changes (e.g. the `SecondarySplashScreen` component was added via a Codex PR while this session was in flight).
