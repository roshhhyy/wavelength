# Wavelength

A browser-based party game inspired by *Wavelength*. One player (the Psychic) sees a hidden target on a dial and gives their team a clue between two opposing concepts (e.g. *Bad pizza topping* ↔ *Great pizza topping*). The team guesses where on the spectrum the target is, and the opposing team gets a chance to bet left or right of that guess.

## Running it

Requires Node 18+.

```bash
npm install
npm run dev      # start the dev server (Vite) at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the built bundle
npm run lint     # run ESLint
```

That's it — no env vars, no backend, no database. It's a pure client-side React app.

## Project layout

```
.
├── index.html              # Vite entry — mounts #root
├── package.json            # react 19 + vite, nothing else
├── vite.config.js
├── eslint.config.js
└── src/
    ├── main.jsx            # React root
    ├── App.jsx             # 7-line shell, renders <WavelengthGame/>
    ├── index.css           # near-empty
    └── WavelengthGame.jsx  # the entire game (~740 lines)
```

All the interesting code lives in **`src/WavelengthGame.jsx`**.

## Inside `WavelengthGame.jsx`

The whole game is one file. Roughly top-to-bottom:

| Section | Lines | What it is |
|---|---|---|
| `PROMPTS` | ~3 | ~95 hardcoded prompt pairs (left concept, right concept). |
| `DEFAULT_TEAMS` | ~78 | Default team configs (name, hue, player count). |
| Geometry + scoring helpers | ~97–115 | Dial math constants (`CX`, `CY`, `R`), `randomTarget`, `getScore`, score labels/colors. |
| `Dial` component | ~120 | SVG dial with drag-to-rotate via pointer events. Renders the needle, target band, and bullseye. |
| `PH` enum | ~217 | Game phases: `SETUP → LOOK → PSYCHIC → GUESS → COUNTER → REVEAL → END`. |
| `TeamCard` component | ~219 | Per-team scoreboard card. |
| `WavelengthGame` (main) | ~248 | The game component itself — phase state machine, scoring, turn rotation. |
| Inline style helpers | ~713+ | Reusable style objects (`setupBox`, `bigNum`, `stepBtn`, `labelBox`, …). |

### State variables (terse names)

The main component uses ~20 `useState` slots with short names. Cheat sheet:

- `numTeams`, `teamConfigs`, `turnsPerPlayer` — setup screen inputs
- `teams` — the active locked-in teams once the game starts
- `used` — `Set` of prompt indexes already played, so prompts don't repeat
- `pi` — current **p**rompt **i**ndex
- `target` — hidden target angle (0–180°)
- `needle` — current needle angle the guessing team is moving
- `ph` — current **ph**ase (one of `PH.*`)
- `scores` — array of cumulative scores, one per team
- `rs` — **r**ound **s**core for the active team this round
- `rd` — **r**oun**d** counter
- `at` — **a**ctive **t**eam index
- `cgDir`, `cgCorrect`, `cgTeamIdx` — **c**ounter-**g**uess state (which side, was it right, which team)
- `winner`, `turnsUsed`, `cd` (countdown), `paused`, `skipAvailable` — misc UI flags

### Phase flow

```
SETUP    → choose teams + turns
LOOK     → other teams look away while psychic sees target
PSYCHIC  → psychic gives a clue (target visible only to them)
GUESS    → their team moves the needle to guess
COUNTER  → opposing team bets left/right of the guess
REVEAL   → target shown, scores awarded
           ↓
        next team's turn (back to LOOK) until all turns used
           ↓
END      → winner displayed
```

Scoring uses `getScore` (lines ~107–113): the needle lands in concentric bands worth 4 / 3 / 2 / 0 points based on angular distance from `target`. The counter-guessing team gets +1 for guessing the correct side.

## Notes

- No tests, no router, no backend.
- All styling is inline JS objects — no CSS framework, no styled-components.
- There's a stray `wavelength-game.jsx` at the repo root that's a duplicate of `src/WavelengthGame.jsx`. It's unused and safe to delete.
