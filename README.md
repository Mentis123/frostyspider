# Frosty Spider 🕷️❄️

A mobile-first Spider Solitaire game — a Birb Labs **breakable toy** built to be
played, inspected, broken, and rebuilt as part of [Vibe Academy](https://www.vibeacademy.com.au/).

Made by **Mentis**.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Vitest (game-engine tests)
- Deployed on Vercel — pushes to `main` auto-deploy

## Architecture in five lines

| Layer | Where | What |
|---|---|---|
| Game logic | `src/lib/gameEngine.ts` | Pure, immutable Spider rules: deals, moves, completion, win/stuck detection, seeded shuffles |
| Layout math | `src/lib/layoutCalculator.ts` | Measures the real container and computes card sizes, stack offsets, and run compression |
| Feedback | `src/lib/feedback.ts` | Web Audio (with HTMLAudio fallback), background music, haptics |
| State | `src/contexts/GameContext.tsx` | Reducer with snapshot-based undo/redo and localStorage persistence |
| UI | `src/components/` | `Game` orchestrates splash → board → modals; `GameBoard` owns drag/drop |

## House rules

1. **Never test locally** — push to git, Vercel auto-deploys
2. **Mobile-first** — touch devices are primary, desktop is for testing only
3. **Straight to main** — no staging branches

CI (GitHub Actions) runs typecheck, lint, tests, and a production build on every
push and PR, so broken commits are caught before Vercel ships them.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (game engine suite)
npm run build       # next build
```

## More

See `CLAUDE.md` for the full source layout, splash-flow state machine, and
conventions, and `CODEBASE_EVALUATION.md` for a deep review of the codebase with
a prioritized improvement roadmap.
