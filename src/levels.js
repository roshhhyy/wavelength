// Couples Mode level definitions.
//
// Each level has:
//   prompts        – number of prompts you draw before the level ends
//   target         – minimum score to win (1-star threshold)
//   star2 / star3  – score thresholds for 2 and 3 stars (≥)
//   pool           – which difficulty pool to draw from: "easy" | "hard" | "any"
//
// Scoring per prompt: 4 (Bullseye) / 3 (Close) / 2 (Near) / 0 (Miss).
// Max possible score for a level = prompts × 4.
//
// The curve eases you in, then tightens. Levels 9–10 are "perfection" tiers
// where 1-starring is the achievement.

export const COUPLES_LEVELS = [
  { level: 1,  prompts: 6, target: 9,  star2: 13, star3: 18, pool: "easy" },
  { level: 2,  prompts: 5, target: 11, star2: 14, star3: 17, pool: "easy" },
  { level: 3,  prompts: 6, target: 14, star2: 17, star3: 20, pool: "easy" },
  { level: 4,  prompts: 6, target: 17, star2: 19, star3: 22, pool: "any"  },
  { level: 5,  prompts: 7, target: 21, star2: 23, star3: 26, pool: "any"  },
  { level: 6,  prompts: 7, target: 24, star2: 25, star3: 27, pool: "any"  },
  { level: 7,  prompts: 8, target: 28, star2: 30, star3: 31, pool: "any"  },
  { level: 8,  prompts: 6, target: 22, star2: 23, star3: 24, pool: "hard" },
  { level: 9,  prompts: 5, target: 19, star2: 20, star3: 20, pool: "hard" },
  { level: 10, prompts: 4, target: 16, star2: 16, star3: 16, pool: "hard" },
];

export function starsForScore(level, score) {
  if (score < level.target) return 0;
  if (score >= level.star3) return 3;
  if (score >= level.star2) return 2;
  return 1;
}
