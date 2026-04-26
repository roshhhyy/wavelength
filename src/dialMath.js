// Dial geometry + pure scoring helpers shared by both modes.
export const CX = 300, CY = 300, R = 260, IR = 44;
export const deg2rad = d => (d * Math.PI) / 180;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const BULL_HALF = 4;

export function randomTarget() {
  return Math.random() * (180 - BULL_HALF) + BULL_HALF / 2;
}

// Score banding: 4 (Bullseye) / 3 (Close) / 2 (Near) / 0 (Miss)
export function getScore(needle, target) {
  const d = Math.abs(needle - target);
  if (d <= 4) return 4;
  if (d <= 11) return 3;
  if (d <= 20) return 2;
  return 0;
}
export const scoreLbl = s => s === 4 ? "BULLSEYE!" : s === 3 ? "Close!" : s === 2 ? "Near" : "Miss";
export const scoreClr = s => s === 4 ? "#c084fc" : s === 3 ? "#60a5fa" : s === 2 ? "#fbbf24" : "#64748b";

// Hue → palette helper
export function ts(hue) {
  return {
    color: `hsl(${hue},80%,65%)`,
    accent: `hsl(${hue},70%,80%)`,
    bg: `hsla(${hue},80%,55%,0.08)`,
    border: `hsla(${hue},80%,55%,0.25)`,
    dim: `hsla(${hue},60%,50%,0.15)`,
  };
}
