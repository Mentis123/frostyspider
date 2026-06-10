# Frosty Spider — Comprehensive Codebase Evaluation & Recommendations

> A full-stack review of architecture, game logic, state management, UI/UX, accessibility,
> performance, audio, assets, tooling, and documentation. Findings are referenced by
> `file:line` against the current `main`. Each item carries a severity
> (**Critical / High / Medium / Low / Nit**) and a concrete recommendation.

---

## Executive Summary

Frosty Spider is in genuinely good shape for a breakable toy: the game engine is pure and
immutable, TypeScript strict mode is on with no `any` in `src/`, the layout system is an
unusually thoughtful piece of mobile engineering, and the feedback layer (audio + haptics)
is ambitious. The architecture has a clean three-layer split — pure logic (`src/lib`),
state (`src/contexts`), presentation (`src/components`) — which is exactly right.

The gaps cluster in five areas:

1. **Zero safety net.** No tests, no CI, and a "straight to main, never test locally" house
   rule. The pure game engine is the easiest-to-test code imaginable and is currently
   unprotected.
2. **Asset weight.** A 2.7 MB splash PNG and a 1.8 MB music MP3 dominate the critical path
   on the primary (mobile) audience.
3. **Accessibility is absent.** No ARIA, no keyboard play, no `prefers-reduced-motion`.
4. **Drift and dead code.** ~700 lines of unused components, a manifest pointing at icons
   that don't exist, branding that still says "Spider Mobile", and CLAUDE.md describing a
   Next.js 15 / `.jpg`-splash world that no longer exists (package.json says Next 16.1.1,
   the splash is a `.png`).
5. **A handful of real bugs**, the clearest being the redo button playing the undo sound
   and `moveCards()` unconditionally returning `true`.

**Overall grade: B.** Solid core, professional structure, but shipping blind (no CI/tests),
heavy on the wire, and invisible to assistive tech. The prioritized roadmap at the end
estimates ~2–3 focused days to reach an A.

---

## 1. Confirmed Bugs (fix first)

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| 1 | High | `src/components/ControlBar.tsx:32` | Redo plays the **undo** sound: `gameFeedback('undo', …)` inside `handleRedo`. Should be `'redo'`. |
| 2 | High | `public/manifest.json` | Manifest references `/icon-192.png` and `/icon-512.png`; **neither file exists** in `public/`. PWA install prompts and Lighthouse will fail/warn. Generate icons (the unused `FrostySpider.tsx` SVG mascot is a perfect source). |
| 3 | High | `src/contexts/GameContext.tsx:196–204` | `moveCards()` **always returns `true`**, even for invalid moves — the comment admits it, and the captured `stateBefore` variable is unused. Any caller using the return value for error feedback (sound/haptic on invalid move) gets lied to. Fix: validate with the engine (`getValidSequence` + `canMoveToColumn`) before dispatching, and return the real result. |
| 4 | Medium | `public/manifest.json:2–3` | App is named **"Spider Mobile"**, not Frosty Spider. Branding drift from a sibling project. Also `"orientation": "portrait"` contradicts the landscape layout the app explicitly supports (`layoutCalculator.ts:140`). |
| 5 | Medium | `src/contexts/GameContext.tsx:160–194` | **Save/load ordering hazard on mount.** The persistence effect (line 187) runs on first mount with the empty placeholder state and writes it to `localStorage`, momentarily clobbering the saved game before the load effect's dispatched restore re-saves it on the next render. Works in the happy path only by ordering luck; a crash or tab close in that window loses the save. Fix: skip persistence until the initial load has completed (a `loadedRef` guard), or persist from the reducer's action path instead of an effect. |
| 6 | Medium | `src/contexts/GameContext.tsx:168–175` | **No schema validation on restore.** `JSON.parse(savedGame)` is cast straight into `GameState`. Any older/corrupted shape (e.g., after a future field rename) crashes the board at render time rather than starting fresh. Add a cheap structural validator (check `tableau` is a 10-array of card arrays, etc.) and fall back to `NEW_GAME`. |
| 7 | Low | `src/contexts/GameContext.tsx:149` | `isClient` state is set but **never read** — its only effect is one extra render on mount. Delete it. |
| 8 | Low | `src/lib/feedback.ts:9` | `AUDIO_DEBUG = true` ships ~27 `console.log` calls to production. Gate on `process.env.NODE_ENV === 'development'`. |
| 9 | Low | `src/lib/gameEngine.ts:5` / `src/lib/types.ts:33–45` | `Move` is imported by the engine but never used; `Move` and `HistoryEntry` types are dead (GameContext rolls its own `StateWithHistory`). Delete or actually adopt them for a structured move log (see §3, scoring/replay). |

---

## 2. Architecture & Design

### What's right

- **Three clean layers.** `gameEngine.ts` is fully pure and immutable — every mutation
  returns a fresh state, no DOM, no async. `GameContext` is a textbook
  reducer-with-history. Components stay presentational. This is the single best property
  of the codebase; protect it.
- **Snapshot-based undo/redo** (`GameContext.tsx:41–101`) is the right call at this scale:
  104 cards × a few hundred moves is trivial memory, and it's impossible to get out of
  sync the way command-pattern undo can.
- **`layoutCalculator.ts` as a single source of truth** for geometry, driven by measured
  container dimensions rather than viewport guessing, is genuinely good mobile
  engineering. The portrait 3/3/4 row split for ten columns is an unconventional but
  defensible adaptation of Spider to a phone screen.

### Findings

- **High — redundant deep cloning betrays mistrust of immutability.**
  `cloneGameState(state.current)` is called when pushing history
  (`GameContext.tsx:66,77,89,99`), but engine states are already immutable — nothing ever
  mutates a past state. The clones are pure waste (allocation + GC on every move) and,
  worse, signal to future contributors that mutation might happen somewhere. Either trust
  immutability and store references, or enforce it (`Object.freeze` in dev) and then trust it.

- **High — context value is rebuilt every render** (`GameContext.tsx:239–250`), and the
  action callbacks depend on `state.current` (`moveCards`, `autoMove`, `deal`), so every
  consumer re-renders on every state change regardless of what it reads. Fix in two steps:
  1. Move validation into the reducer/engine so callbacks only need `dispatch` (stable).
  2. `useMemo` the value, or split into `GameStateContext` + `GameActionsContext` so
     ControlBar's buttons stop re-rendering during drags.

- **Medium — history is unbounded and not persisted.** Unbounded is fine memory-wise, but
  a reload silently destroys the undo stack while the manifest advertises "infinite
  undo". Either persist history (cap at ~200 snapshots) or drop "infinite" from the copy.

- **Medium — `layoutCalculator.ts` (609 lines) carries visible strata.** It contains a
  self-described legacy function (`getRunIndicatorHeight`, line 418), a non-compressed
  fallback path inside `calculateSegmentLayout` (line 457), and three overlapping offset
  calculators (`calculateSmartOverlap`, `calculateExpandedOffsets`,
  `calculateSegmentLayout`). Audit which paths the UI actually exercises and delete the
  rest — this file is the hardest one in the repo to reason about, and half of it may be
  unreachable.

- **Low — settings live inside `GameState`.** `UPDATE_SETTINGS` mutates
  `state.current.settings`, which means undo can resurrect old settings and every settings
  toggle invalidates game-state consumers. Settings are app-level, not game-level: lift
  them into their own context/persistence and keep only `suitCount` snapshotted at deal
  time.

---

## 3. Game Engine (`src/lib/gameEngine.ts`)

### Correctness

The rules are implemented correctly: 104 cards, 6/6/6/6/5×6 deal (54 tableau + 50 stock),
any-suit descending placement, same-suit-only sequence completion, no dealing onto empty
columns, win at 8 completed runs. Two subtleties worth documenting (and testing):

- **The Ace invariant** (`gameEngine.ts:138–168`): `hasCompleteSequence` scans *every*
  13-card window in a column, which would be wrong if a completed run could ever have
  cards stacked on top of it — but it can't, because nothing places on an Ace
  (`RANK_VALUES['A'] === 1`, and a mover must be exactly one lower). The code is correct
  only because of this non-obvious invariant. It deserves a comment and a unit test, since
  a future variant (or a refactor of `canMoveToColumn`) could silently break it.

- **`isGameStuck`** (`gameEngine.ts:320–345`) is correct but exhaustively re-evaluates
  every face-up index; fine at this scale, but note that nothing in the UI appears to
  surface "you're stuck" to the player (see §5 — this is a missed UX moment, not an
  engine bug).

### Design gaps (Medium unless noted)

- **`findBestMove` scoring is strategically naive** (`gameEngine.ts:278–317`). It prefers
  same-suit targets (+100) — good — but then prefers *longer* columns ("consolidate"),
  which is backwards for Spider: burying cards in long columns is how games die. It also
  ignores the two highest-value heuristics: *does this move expose a face-down card?* and
  *does this move break an existing same-suit run at the source?* A tap-to-auto-move that
  occasionally makes actively bad moves erodes player trust. Suggested scoring order:
  same-suit extension ≫ exposes face-down ≫ empties a column usefully ≫ everything else;
  penalize breaking same-suit runs.
- **No scoring system.** Classic Spider scoring (start 500, −1 per move, +100 per
  completed run) is ~15 lines in this engine and unlocks the stats/win-modal improvements
  in §5. The dead `Move` type in `types.ts` is the natural seed for a structured move log.
- **No seeded deals** (`shuffleDeck` uses `Math.random`, line 51). A tiny seeded PRNG
  (mulberry32 is 4 lines) enables: replay-same-deal, shareable deals, a daily challenge,
  and — crucially — deterministic engine tests. Highest ratio of capability-gained to
  lines-written in this whole document.
- **No winnability consideration.** Classic Spider doesn't guarantee winnable deals
  either, so this is optional — but with seeded deals you could curate known-winnable
  seeds for a "relaxed" mode. Worth a backlog card, not a sprint.
- **Nit:** `cardIdCounter` is module-global state in an otherwise pure module
  (`gameEngine.ts:15`). Harmless today (reset in `initializeGame`), but it's the one
  impurity; derive IDs from deal order instead and the module becomes fully deterministic
  given a seed.

---

## 4. UI / Components

### GameBoard (`src/components/GameBoard.tsx`, 653 lines)

The most load-bearing and most overloaded file: layout measurement, drag state, tap/select
logic, hit-testing, and rendering for three different segment types all live here.

- **High — no drag threshold.** Drag initiates on the first pointer move, so minor finger
  jitter during a tap becomes an accidental micro-drag. Standard fix: ignore movement
  until ~8–10 px from the touch origin, treating anything under it as a tap. This is the
  single biggest feel improvement available for touch.
- **High — hand-rolled hit-testing with generous fudge margins**
  (`getColumnAtPosition`, ~line 113: `±10 px` horizontal, `+100 px` below the column
  bounds). In the portrait 3/3/4 layout where rows sit close together, that +100 px reach
  means a drop near a row boundary can land in the wrong row's column. Replace with
  `document.elementFromPoint(x, y)` + `closest('[data-column]')`, which respects actual
  rendered geometry for free.
- **High — full-board re-render on every state change.** `Card` is not memoized and
  receives fresh handler closures every render, and the `columnLayouts` memo recomputes
  all ten columns whenever any card moves. During a drag (state updates per pointer-move)
  this is the difference between 60 fps and jank on older phones. Fix: `React.memo(Card)`,
  stable handlers via a small drag context or `useCallback` with column/index args, and
  per-column layout memoization keyed on the column's card IDs.
- **Medium — ResizeObserver with no debounce** triggers the full layout→render cascade on
  every resize tick (continuous during mobile address-bar show/hide and orientation
  change). Debounce ~100 ms.
- **Medium — multi-touch handling is start-only.** A second finger mid-drag isn't
  handled; cancel the drag (or ignore the new touch) in `touchmove` when
  `touches.length !== 1`, and make sure `touchcancel` always clears drag state.
- **Low — duplicate empty-column tap wiring** (outer column `onClick` and inner
  `EmptySlot onClick` both route to `handleEmptyColumnTap`). Harmless, but one should go.

**Structural recommendation:** split GameBoard into `ColumnView` (one column's segments),
`DragLayer` (ghost rendering + pointer plumbing), and a `useDragController` hook owning
all pointer math. Also: the code currently maintains parallel mouse and touch handler
paths — **Pointer Events** (`onPointerDown/Move/Up` + `setPointerCapture`) unify them,
shrink the file substantially, and fix the listener re-attachment churn in one move.

### Other components

- **Medium — `Card.tsx` font sizes are pure percentages of card width** (e.g. rank ≈
  `cardWidth * 0.22`), so at the 50 px minimum card width the rank renders ~11 px. Clamp
  text to a readable floor (`Math.max(13, …)`).
- **Medium — modals (`SettingsModal`, `WinModal`) have no focus trap, no `Escape` close,
  no `role="dialog"`/`aria-modal`.** ~30 lines or a headless dialog primitive fixes all
  three.
- **Low — no card-flip animation** when a face-down card is revealed — the single most
  satisfying moment in solitaire currently just pops. A 200 ms `rotateY` flip (skipped
  under reduced-motion) would do a lot for game feel.
- **Low — empty-column affordance** is a faint dashed border with no hint of what can go
  there; selection state relies on color alone (yellow ring) with no shape/scale change.

---

## 5. UX & Game Design

- **High — splash friction.** Two mandatory tap-through screens stand between launch and
  play (primary splash → Vibe attribution), gated per *session*, so every fresh visit
  pays the toll twice over a 2.7 MB image. Recommendations, in increasing spice:
  (a) keep both but make the attribution auto-advance after ~2.5 s with tap-to-skip;
  (b) gate the pair on `localStorage` (first visit ever) instead of `sessionStorage`, with
  the attribution kept reachable from Settings/Win modal so the Vibe Academy credit isn't
  lost; (c) merge the two into a single screen with the attribution as a footer.
- **High — no "stuck" detection surfaced.** The engine ships `isGameStuck`
  (`gameEngine.ts:320`) but the UI never tells the player; a stuck player just stares.
  Show a gentle toast — "No moves left — undo or start a new game" — when it flips true.
- **Medium — no hint feature.** `findBestMove` already exists; a Hint button that
  briefly pulses the best source→target pair is nearly free and is table stakes for the
  genre. (Fix its scoring first, per §3.)
- **Medium — no stats or scoring surface.** No games-played/won, win streak, best time,
  or score. With engine scoring (§3) plus a tiny `localStorage` stats record, the
  WinModal goes from "You won" to a reason to replay. The manifest already promises more
  than the UI delivers.
- **Medium — dealing UX edge case:** dealing is blocked while any column is empty
  (correct rule), but verify the UI explains *why* the stock tap did nothing — silent
  refusal reads as a bug to players. An error haptic + brief "fill empty columns first"
  message is enough.
- **Low — timer semantics:** `startTime` persists across reloads, so an overnight pause
  counts as elapsed time. Store accumulated-elapsed on save instead, and pause while the
  tab is hidden (`visibilitychange`).
- **Low — win celebration:** the sparkle uses literal `*` characters
  (`StackCompleteAnimation.tsx`); the snowfall is already charming — let the sparkles
  match (SVG/emoji).

---

## 6. Accessibility (currently absent — Critical as a category)

There is no ARIA, no keyboard path, no reduced-motion handling anywhere in `src/`. For a
learning artefact people are meant to inspect and copy, this teaches the wrong default.
Minimum viable a11y, in priority order:

1. **`prefers-reduced-motion`** media query disabling snowfall/confetti/sparkle/flip
   animations (pure CSS, ~10 lines in `globals.css`).
2. **Labels:** `aria-label="${rank} of ${suit}, face up"` on cards, labels on every
   icon-only ControlBar button, `role="dialog"` + `aria-modal` + focus trap on modals.
3. **Announcements:** one polite `aria-live` region in `Game.tsx` announcing moves,
   deals, run completions, and wins.
4. **Keyboard play:** arrow keys to move a column/card cursor, Enter to pick up/drop,
   U/R for undo/redo. The tap-to-select model already in GameBoard maps almost 1:1 onto
   this — it's the same state machine with a different input source.
5. **Contrast pass:** the dashed empty-column border (`border-gray-400` on dark green)
   and disabled-button gray both sit near or below WCAG AA; one shade lighter fixes both.

---

## 7. Audio & Haptics (`src/lib/feedback.ts`, 590 lines)

The dual-path design (Web Audio with HTMLAudio fallback) is the right architecture for
iOS reality. Issues, in order:

- **High — AudioContext is created at module import** (singletons instantiated at
  `feedback.ts:378/477`, constructor calls `setupAudioContext` at line 43). It is
  correctly SSR-guarded (`typeof window` check, line 42), but on the client it runs
  before any user gesture, so the context starts `suspended` on iOS/Chrome and the
  console warns. The unlock-listener machinery then exists to clean up a mess that lazy
  creation (first call to `init()`, which `Game.tsx` already invokes from a gesture)
  would avoid entirely.
- **Medium — `init()` can stack unlock listeners.** The `isInitialized` flag exists but
  the document-level unlock handlers aren't tracked/removed across repeated `init()`
  calls. Use an `AbortController` and pass its `signal` to every `addEventListener`.
- **Medium — win fanfare oscillator hygiene:** notes are scheduled via `setTimeout` loops
  creating oscillator+gain pairs with no explicit disconnect; prefer scheduling all notes
  up-front on the AudioContext clock (`osc.start(ctx.currentTime + i * delta)`) and
  letting `onended` disconnect.
- **Medium — duplication:** `playClick/playMove/playError/playSuccess` are the same
  ~15-line pattern four times, and the beep definitions are hardcoded per-sound. A
  `SOUNDS` config table + one `play(name)` collapses ~120 lines.
- **Low — music failure is silent and unrecoverable** until the next gesture; retry once
  on the next `pointerdown` after a failed `audio.play()`.
- **Nit — iPad detection** via `navigator.platform === 'MacIntel'` + touch check is the
  standard hack but worth a comment; `navigator.userAgentData` where available is cleaner.

---

## 8. Assets & PWA

| Asset | Size | Verdict |
|---|---|---|
| `splash_screen.png` | **2.7 MB** | Critical-path blocker. This is the first thing every mobile visitor downloads, on the screen they must tap to proceed. Convert to WebP/AVIF ≤ 300 KB (or serve via `next/image` with `priority`). |
| `home_sound.mp3` | **1.8 MB** | Re-encode ~96 kbps (~700 KB) and ensure it's lazy-loaded after first interaction, never on the critical path. |
| `splash_screen.jpg` | 88 KB | **Unused** — `SplashScreen.tsx:40` loads the `.png`. Delete (and fix CLAUDE.md:77, which claims `.jpg` is the splash). |
| `icon-192.png`, `icon-512.png` | missing | Referenced by manifest; generate (FrostySpider mascot SVG → PNG), include a `purpose: "any maskable"` variant. |
| `next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg` | ~5 KB | create-next-app leftovers, unreferenced. Delete. |

Also PWA-adjacent: no service worker / offline support. For a solitaire game — the
canonical airplane-mode app — offline is a feature users will actually expect. A minimal
`next-pwa` or hand-rolled cache-first SW over the static assets gets you there cheaply.
Pair with `"orientation": "any"` in the manifest (the landscape layout already exists).

---

## 9. Tooling, CI, Testing

- **Critical — no CI whatsoever.** With "never test locally" + "straight to main", the
  only gate between a typo and production is Vercel's build. Add one GitHub Actions
  workflow running `tsc --noEmit`, `npm run lint`, and `next build` on push/PR (~25 lines
  of YAML). This is the highest-leverage 30 minutes available in this repo, and it makes
  every future AI-assisted session safer — which *is* the Vibe Academy use case.
- **Critical — zero tests, while `gameEngine.ts` is a pure-function testing dream.** A
  single Vitest file (~200 lines) covering deck composition per suit-count, deal shape
  (54/50), move validation, the Ace invariant (§3), sequence completion + win detection,
  deal-blocked-on-empty-column, stuck detection, and an undo/redo round-trip would
  protect everything that matters. Seeded shuffling (§3) makes these deterministic.
- **High — `next.config.ts` is empty.** At minimum: `images.formats:
  ['image/avif', 'image/webp']` (then actually use `next/image` for the splash and card
  back) and `productionBrowserSourceMaps: false`.
- **Medium — `typescript` is pinned to exactly `5.9.3`** (commit 72605cf, message gives
  no reason). Pinning is fine *if documented*; right now it reads as a forgotten
  emergency fix. Either record why in CLAUDE.md or restore `^5.x`.
- **Low — `tsconfig.json` has `allowJs: true`** with zero JS files in the repo; drop it.
  Note `VIBE_ACADEMY_SPLASH_TEMPLATE.tsx` at repo root is inside the `**/*.tsx` include
  glob, so it's type-checked on every build — intentional? If it drifts out of sync with
  its consumers it will fail *this* repo's build. Consider excluding it or moving it to
  `docs/`.
- **Low — lint coverage:** the unused `stateBefore` variable in `GameContext.tsx:198`
  surviving on main suggests `npm run lint` isn't part of anyone's loop — one more
  argument for CI rather than for more rules.

---

## 10. Dead Code & Documentation Drift

### Dead code inventory (~700 lines)

| Item | Lines | Status | Recommendation |
|---|---|---|---|
| `src/components/FrostySpider.tsx` | 263 | Never imported | It's a charming SVG mascot (snowman-spider). **Use it**: app icon source (§8), empty-column watermark, or win-modal cameo. If not, delete — git remembers. |
| `src/components/VibeSplashScreen.tsx` | 57 | Never imported (superseded by `SecondarySplashScreen`) | Delete. CLAUDE.md already documents it as "kept as reference", but the repo-root template serves that purpose; two reference copies is one too many. |
| `types.ts` `Move`, `HistoryEntry` | ~15 | Never used | Delete or adopt for move-log/scoring (§3). |
| `layoutCalculator.ts` legacy paths | ~100? | `getRunIndicatorHeight` is labeled legacy; non-compression fallback + `calculateExpandedOffsets` need a usage audit | Audit and prune. |
| `public/*.svg` boilerplate (5 files) | — | Never referenced | Delete. |
| `public/splash_screen.jpg` | — | Superseded by `.png` | Delete. |

### Documentation drift

- `CLAUDE.md` says **Next.js 15**; `package.json` says **`next: 16.1.1`**.
- `CLAUDE.md:77` says the splash image is `public/splash_screen.jpg`; the code uses
  `splash_screen.png`.
- `CLAUDE.md`'s source-layout table omits `gameEngine.ts`, `layoutCalculator.ts`,
  `types.ts`, and `FrostySpider.tsx` — the entire logic layer is undocumented in the file
  whose job is orienting AI sessions. For a repo explicitly worked on by parallel
  AI agents, CLAUDE.md accuracy is infrastructure, not paperwork.
- `README.md` is still the stock create-next-app README — it even says `npm run dev`
  while the house rules forbid local testing. For a *learning artefact meant to be
  inspected*, the README is the front door: describe what it is, link the deployment,
  explain the architecture in five lines, state the house rules.
- `manifest.json` description promises "infinite undo" (true-ish, see §2 history note)
  under the name "Spider Mobile" (wrong brand).

---

## 11. Prioritized Roadmap

### P0 — Stop shipping blind (≈ half a day)
1. GitHub Actions: typecheck + lint + build on push/PR.
2. Vitest + ~200-line `gameEngine` test suite (add seeded shuffle to enable it).
3. Fix confirmed bugs: redo sound (`ControlBar.tsx:32`), `moveCards` return value,
   persistence ordering guard, restore-validation.

### P1 — Respect the mobile user (≈ half a day)
4. Compress splash (≤300 KB WebP) and music (~700 KB); delete unused assets; generate the
   missing PWA icons; fix manifest name/orientation.
5. Drag threshold + `elementFromPoint` hit-testing + multi-touch cancel in GameBoard.
6. `React.memo(Card)`, per-column layout memoization, debounced ResizeObserver.

### P2 — Open the door (≈ one day)
7. Accessibility minimum: reduced-motion CSS, ARIA labels, live region, modal focus
   traps, contrast fixes; then keyboard play.
8. Splash-flow softening (auto-advance attribution or first-visit-only gating).
9. Surface `isGameStuck`, add Hint (after fixing `findBestMove` scoring), explain blocked
   deals.

### P3 — Make it a game people return to (backlog)
10. Scoring + stats + richer WinModal; persistent undo history or honest copy.
11. Seeded daily deal / replay-this-deal / share-a-deal.
12. Offline support (service worker) — solitaire belongs on airplanes.
13. Card-flip animation; mascot integration; settings split out of GameState.
14. Refactor GameBoard into ColumnView + DragLayer + `useDragController` on Pointer
    Events; prune layoutCalculator legacy paths; dedupe feedback.ts sound players.
15. CLAUDE.md + README rewrite to match reality (do alongside any P0–P2 batch).

---

## Closing Observation

The bones here are better than most hobby solitaires: a pure engine, strict types, real
thought about mobile geometry, and honest separation of concerns. Nearly everything in
this document is *finishing* work — the difference between a demo that plays well on the
author's phone and a small product that survives other people's phones, fingers, screen
readers, and network plans. Given that Frosty Spider's stated purpose is to be inspected
and learned from, the highest-order recommendation is meta: add the CI, the tests, and
the accurate docs first, because they teach every future reader — human or AI — how this
codebase wants to be treated.
