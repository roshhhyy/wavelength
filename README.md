# Wavelength

A browser-based party game inspired by *Wavelength*. The Psychic sees a hidden target on a dial and gives a clue between two opposing concepts (e.g. *Bad pizza topping* ↔ *Great pizza topping*). The team drags the needle to guess where on the spectrum the target is.

**Play it live:** [roshhhyy.github.io/wavelength](https://roshhhyy.github.io/wavelength/)

Two modes:

- **Team Battle** — 2–6 teams, take turns being psychic. The next team in rotation can bet left/right of the guess for a bonus point. Configurable players per team and turns per player.
- **♥ Couples** — two-player co-op. Strict-alternation psychic role across 10 hand-tuned levels. Hit the target score before you run out of prompts. Star ratings (1/2/3) per level reward consistency. L1 is forgiving; L10 ("Mythic") demands bullseyes only.

Other features: 300 prompts grouped by category, a **Prompt Cards** manager to enable/disable individual prompts (and view full text in a detail modal), session auto-resume on refresh, persistent game history, hold-to-skip on the look-away countdown, and Cloudflare Web Analytics.

## Running it

Requires Node 18+.

```bash
npm install
npm run dev      # start the Vite dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the built bundle
npm run lint     # run ESLint
```

No env vars, no backend, no database. Pure client-side React.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml). The workflow runs `npm ci && npm run build` and uploads `dist/` as a Pages artifact. The base path is set in [vite.config.js](vite.config.js) (`base: '/wavelength/'`) so all asset URLs resolve under the project subpath.

Analytics are wired through Cloudflare Web Analytics (script tag at the bottom of [index.html](index.html)).

## Project layout

```
.
├── index.html                # Vite entry; analytics beacon
├── package.json              # react 19 + vite
├── vite.config.js            # base path for GH Pages
├── .github/workflows/        # auto-deploy to GitHub Pages
└── src/
    ├── main.jsx              # React root
    ├── App.jsx               # renders <WavelengthGame/>
    ├── index.css             # near-empty
    ├── prompts.js            # all 300 prompts + CATEGORIES + promptKey()
    ├── levels.js             # Couples-mode level definitions + starsForScore()
    ├── dialMath.js           # geometry constants + scoring helpers + ts() palette
    ├── Dial.jsx              # the SVG dial component (drag-to-rotate)
    ├── WavelengthGame.jsx    # team mode + entry point + setup screen + mode toggle
    ├── PromptsManager.jsx    # enable/disable prompts UI (per-category, with detail view)
    └── CouplesMode.jsx       # full Couples-mode flow (menu, levels, win/lose screens)
```

All UI is inline JS-object styles — no CSS framework. Component organization is flat (no nested folders). Most files are self-contained except for the shared `dialMath.js` and `Dial.jsx`, which both modes consume.

## File-by-file

### [`src/prompts.js`](src/prompts.js)

The deck. 300 prompt cards in a single export:

```js
{ left: "Bad pizza topping", right: "Great pizza topping",
  difficulty: "easy", category: "food" }
```

`difficulty` is `"easy"` (consensus extremes — food, smells, weather) or `"hard"` (subjective, abstract, taste-driven). `category` is one of 12 keys defined in `CATEGORIES` (Food, Animals, Entertainment, Tech, Home/Style, Travel, People, Work, Activities, Events, Body, Imagination). The file also exports `promptKey(p)` which returns a stable content-based ID (`left ‖ right`) used for persisting user toggles without breaking on reordering.

Edit the file to add or remove prompts; the game picks them up on next load.

### [`src/levels.js`](src/levels.js)

Couples-mode level configs:

```js
{ level, prompts, target, star2, star3, pool: "easy" | "hard" | "any" }
```

The curve climbs from L1 (target/max ≈ 38%, easy pool) to L10 ("Mythic", target = max = 16, hard-only — bullseye every prompt). `starsForScore(level, score)` returns 0/1/2/3 based on the thresholds.

### [`src/dialMath.js`](src/dialMath.js) and [`src/Dial.jsx`](src/Dial.jsx)

Pure helpers: dial geometry constants (`CX`, `CY`, `R`, `IR`), `randomTarget()`, `getScore(needle, target)` (4/3/2/0 banding), `scoreLbl`, `scoreClr`, `ts(hue)` palette helper. The Dial component renders the SVG and handles pointer drag.

### [`src/WavelengthGame.jsx`](src/WavelengthGame.jsx)

The team-mode game and the app entry. ~970 lines. Key pieces:

| Section | What it is |
|---|---|
| Persistence helpers | `loadCurrent` / `saveCurrent` / `clearCurrent` (in-progress game), `loadHistory` / `appendHistory` (capped at 100), `loadDisabledPrompts` / `saveDisabledPrompts`. Storage version 2. |
| `Modal` component | Inline overlay used for confirms and the history modal. |
| `WavelengthGame` (main) | Setup screen, scoreboard, look-away countdown, psychic/guess/counter/reveal/end phases, mode toggle to Couples. |
| Style helpers | `setupBox`, `setupLabel`, `bigNum`, `stepBtn`, `miniBtn`, `labelBox`, `modePill`. |

Phases: `SETUP → LOOK → PSYCHIC → GUESS → COUNTER → REVEAL → END`.

State variables in the main component (terse names, kept for compactness):

- `numTeams`, `teamConfigs`, `turnsPerPlayer` — setup inputs
- `teams` — locked-in teams once the game starts
- `used` (Set) + `usedRef` — prompts already drawn this game; ref-based for race-proof draws
- `pi` — current prompt index; `target` / `needle` — angles
- `ph` — current phase
- `scores`, `rs` (round score), `rd` (round counter), `at` (active team idx), `turnsUsed`
- `cgDir`, `cgCorrect`, `cgTeamIdx` — counter-guess result
- `winner`, `cd` (countdown), `paused`, `skipAvailable`
- `startedAt`, `confirmAction`, `showHistory`, `historyEntries`, `resumed` — misc
- `disabledKeys` (Set) + `activeIndicesRef` — user's prompt toggles + the active draw pool
- `showPromptsManager`, `mode` — view state

The draw pool uses a ref-based deck. `pick()` reads `usedRef.current` synchronously and mutates it before calling `setUsed`, so any sequence of draws in the same tick is race-proof.

### [`src/PromptsManager.jsx`](src/PromptsManager.jsx)

Full-screen view reachable from SETUP. Lists all 300 prompts grouped by category. Each card has a toggle dot (click to enable/disable) and a small **i** detail button that opens a modal with the full prompt text in large readable type plus inline Enable/Disable. Categories are collapsible; bulk actions cover all/easy/hard and per-category. Saves write to `wavelength:disabledPrompts` keyed by content hash so reordering or editing prompts.js doesn't scramble user toggles.

### [`src/CouplesMode.jsx`](src/CouplesMode.jsx)

The whole Couples flow. Renders as a `position: fixed` overlay so it owns the viewport. ~680 lines covering:

- Menu screen with P1/P2 name inputs, level select grid (locked levels show 🔒, unlocked show stars earned), big "Continue" button to highest unlocked level
- Per-level flow: handoff with countdown, psychic phase, guess phase, animated reveal
- Push-for-stars: hitting target with prompts left lets you choose "End level" or "Push for more stars →" — extra prompts only ever raise score (no risk)
- Win screen with sequential star pop-in animation, run summary, next/replay/menu actions
- Lose screen with shortfall stat and try-again button
- Round breakdown collapsed under `<details>` so couples can review the run

Honors the global Prompt Cards toggles. If the difficulty pool for a level is too narrow due to user disabling, falls back to any non-disabled prompt.

## Persistence

All state lives in `localStorage` (no backend). Keys:

| Key | Purpose | Cleared when |
|---|---|---|
| `wavelength:current` | In-progress team-mode game (auto-resumes on refresh; toast appears) | Game ends or "New Game" |
| `wavelength:history` | Last 100 completed team games (date, scores, winner) | "Clear History" button |
| `wavelength:disabledPrompts` | User's prompt-toggle state, keyed by content hash | Never (manual via Prompt Cards) |
| `wavelength:couples` | P1/P2 names + per-level `{ stars, bestScore }` | Never (manual via dev tools) |
| `wavelength:mode` | Last-used mode (`team` or `couples`) so the right one shows on next visit | Mode toggle |

All loaders are wrapped in try/catch with a `version` field so a schema bump cleanly discards stale saves.

## Notes

- No tests, no router, no backend.
- Inline JS-object styles throughout — no CSS framework, no styled-components.
- Strict mode + react-hooks/exhaustive-deps + react-refresh/only-export-components are all enforced; lint passes clean.
- A `dist/` folder is generated by builds and gitignored.
