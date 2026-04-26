import { useState, useRef, useCallback, useEffect } from "react";
import { PROMPTS, promptKey } from "./prompts";
import PromptsManager from "./PromptsManager";

const DEFAULT_TEAMS = [
  { name: "Team Alpha", hue: 0, players: 3 },
  { name: "Team Bravo", hue: 217, players: 3 },
  { name: "Team Charlie", hue: 150, players: 3 },
  { name: "Team Delta", hue: 45, players: 3 },
  { name: "Team Echo", hue: 280, players: 3 },
  { name: "Team Foxtrot", hue: 190, players: 3 },
];

function ts(hue) {
  return {
    color: `hsl(${hue},80%,65%)`,
    accent: `hsl(${hue},70%,80%)`,
    bg: `hsla(${hue},80%,55%,0.08)`,
    border: `hsla(${hue},80%,55%,0.25)`,
    dim: `hsla(${hue},60%,50%,0.15)`,
  };
}

const CX = 300, CY = 300, R = 260, IR = 44;
const deg2rad = d => (d * Math.PI) / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const LOOK_SECS = 5;
const BULL_HALF = 4;

function randomTarget() {
  return Math.random() * (180 - BULL_HALF) + BULL_HALF / 2;
}

function getScore(needle, target) {
  const d = Math.abs(needle - target);
  if (d <= 4) return 4;
  if (d <= 11) return 3;
  if (d <= 20) return 2;
  return 0;
}
const scoreLbl = s => s === 4 ? "BULLSEYE!" : s === 3 ? "Close!" : s === 2 ? "Near" : "Miss";
const scoreClr = s => s === 4 ? "#c084fc" : s === 3 ? "#60a5fa" : s === 2 ? "#fbbf24" : "#64748b";

/* ═══════════════════════════════════════════════════════════════════
   DIAL
   ═══════════════════════════════════════════════════════════════════ */
function Dial({ needleAngle, targetAngle, showTarget, onNeedleChange, locked, teamColor }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const toXY = (deg, r) => {
    const rad = deg2rad(180 - deg);
    return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
  };

  const ptrToAngle = useCallback((cx, cy) => {
    const svg = svgRef.current;
    if (!svg) return 90;
    const rc = svg.getBoundingClientRect();
    const sx = 600 / rc.width, sy = 340 / rc.height;
    const x = (cx - rc.left) * sx - CX;
    const y = CY - (cy - rc.top) * sy;
    return clamp(180 - Math.atan2(y, x) * (180 / Math.PI), 2, 178);
  }, []);

  const down = useCallback(e => {
    if (locked) return;
    e.preventDefault(); setDragging(true);
    const p = e.touches ? e.touches[0] : e;
    onNeedleChange(ptrToAngle(p.clientX, p.clientY));
  }, [locked, onNeedleChange, ptrToAngle]);

  const move = useCallback(e => {
    if (!dragging || locked) return;
    e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    onNeedleChange(ptrToAngle(p.clientX, p.clientY));
  }, [dragging, locked, onNeedleChange, ptrToAngle]);

  const up = useCallback(() => { setDragging(false); }, []);

  useEffect(() => {
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
  }, [move, up]);

  const fullWedge = () => {
    const [ox1, oy1] = toXY(0, R);
    const [ox2, oy2] = toXY(180, R);
    const [ix1, iy1] = toXY(0, IR);
    const [ix2, iy2] = toXY(180, IR);
    return <path d={`M${ix1},${iy1} L${ox1},${oy1} A${R},${R} 0 0,0 ${ox2},${oy2} L${ix2},${iy2} A${IR},${IR} 0 0,1 ${ix1},${iy1} Z`} fill="#1a2332" />;
  };

  const wedge = (half, color, opacity) => {
    const a1 = clamp(targetAngle - half, 0, 180);
    const a2 = clamp(targetAngle + half, 0, 180);
    if (a2 - a1 < 0.3) return null;
    const [ox1, oy1] = toXY(a1, R);
    const [ox2, oy2] = toXY(a2, R);
    const [ix1, iy1] = toXY(a1, IR);
    const [ix2, iy2] = toXY(a2, IR);
    const la = (a2 - a1) > 180 ? 1 : 0;
    return <path d={`M${ix1},${iy1} L${ox1},${oy1} A${R},${R} 0 ${la},0 ${ox2},${oy2} L${ix2},${iy2} A${IR},${IR} 0 ${la},1 ${ix1},${iy1} Z`}
      fill={color} opacity={opacity} />;
  };

  const [nx, ny] = toXY(needleAngle, R + 10);
  const ticks = [];
  for (let a = 0; a <= 180; a += 9) {
    const major = a % 45 === 0;
    const [x1, y1] = toXY(a, R);
    const [x2, y2] = toXY(a, R - (major ? 14 : 7));
    ticks.push(<line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"} strokeWidth={major ? 2 : 1} />);
  }

  return (
    <svg ref={svgRef} viewBox="0 0 600 340"
      style={{ width: "100%", maxWidth: 580, cursor: locked ? "default" : "pointer", touchAction: "none", userSelect: "none", display: "block" }}
      onMouseDown={down} onTouchStart={down}>
      {fullWedge()}
      {ticks}
      {showTarget && <>
        {wedge(20, "#f59e0b", 0.4)}
        {wedge(11, "#3b82f6", 0.55)}
        {wedge(4, "#a855f7", 0.75)}
      </>}
      <path d={`M${CX - R},${CY} A${R},${R} 0 0,1 ${CX + R},${CY}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      <path d={`M${CX - IR},${CY} A${IR},${IR} 0 0,1 ${CX + IR},${CY}`} fill="#0d1520" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <line x1={CX - R - 8} y1={CY} x2={CX + R + 8} y2={CY} stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={teamColor} strokeWidth="4.5" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 10px ${teamColor}88)`, transition: dragging ? "none" : "all 0.08s ease" }} />
      <circle cx={CX} cy={CY} r="11" fill="#f8fafc" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))" }} />
      <circle cx={nx} cy={ny} r="8" fill={teamColor} stroke="white" strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${teamColor}99)` }} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
const PH = { SETUP: 0, LOOK: 1, PSYCHIC: 2, GUESS: 3, COUNTER: 4, REVEAL: 5, END: 6 };

function TeamCard({ t, s, score, active, won, turnsUsed, turnsTotal }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 0, padding: "12px 8px 8px", borderRadius: 16, textAlign: "center",
      background: active ? s.bg : "rgba(255,255,255,0.025)",
      border: `2px solid ${active ? s.color : "rgba(255,255,255,0.06)"}`,
      transition: "all 0.35s ease",
      transform: active ? "scale(1.03)" : "scale(1)",
      boxShadow: active ? `0 0 24px ${s.dim}` : "none",
      position: "relative", overflow: "hidden",
    }}>
      {won && <div style={{
        position: "absolute", top: 0, left: 0, right: 0, background: "#facc15",
        color: "#000", fontSize: 9, fontWeight: 800, letterSpacing: 2, padding: "2px 0", textTransform: "uppercase",
      }}>Winner</div>}
      <div style={{
        fontSize: 13, fontWeight: 800, color: active ? s.color : "#64748b",
        letterSpacing: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 2,
      }}>{t.name}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: active ? "#f1f5f9" : "#475569", lineHeight: 1.1, margin: "2px 0" }}>{score}</div>
      {turnsTotal > 0 && <div style={{ fontSize: 10, color: "#64748b" }}>{turnsUsed}/{turnsTotal}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PERSISTENCE
   ═══════════════════════════════════════════════════════════════════ */
const STORAGE_VERSION = 2;
const KEY_CURRENT = "wavelength:current";
const KEY_HISTORY = "wavelength:history";
const KEY_DISABLED_PROMPTS = "wavelength:disabledPrompts";
const HISTORY_MAX = 100;

function loadDisabledPrompts() {
  try {
    const raw = localStorage.getItem(KEY_DISABLED_PROMPTS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function saveDisabledPrompts(set) {
  try {
    localStorage.setItem(KEY_DISABLED_PROMPTS, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

function loadCurrent() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== STORAGE_VERSION) return null;
    return { ...d, used: new Set(d.used || []) };
  } catch { return null; }
}
function saveCurrent(s) {
  try {
    localStorage.setItem(KEY_CURRENT, JSON.stringify({
      ...s, version: STORAGE_VERSION, used: [...s.used],
    }));
  } catch { /* ignore */ }
}
function clearCurrent() {
  try { localStorage.removeItem(KEY_CURRENT); } catch { /* ignore */ }
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (!raw) return [];
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function appendHistory(entry) {
  try {
    const next = [{ ...entry, version: STORAGE_VERSION }, ...loadHistory()].slice(0, HISTORY_MAX);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(5,8,14,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, #161e2f 0%, #0f1422 100%)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
        padding: "24px 28px", maxWidth: 460, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)", maxHeight: "85vh",
        display: "flex", flexDirection: "column",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
export default function WavelengthGame() {
  const [numTeams, setNumTeams] = useState(2);
  const [teamConfigs, setTeamConfigs] = useState(DEFAULT_TEAMS.map(p => ({ ...p })));
  const [turnsPerPlayer, setTurnsPerPlayer] = useState(2);

  const [teams, setTeams] = useState([]);
  const [used, setUsed] = useState(new Set());
  const [pi, setPi] = useState(null);
  const [target, setTarget] = useState(90);
  const [needle, setNeedle] = useState(90);
  const [ph, setPh] = useState(PH.SETUP);
  const [scores, setScores] = useState([]);
  const [rs, setRs] = useState(null);
  const [rd, setRd] = useState(0);
  const [at, setAt] = useState(0);
  const [cgDir, setCgDir] = useState(null);
  const [cgCorrect, setCgCorrect] = useState(null);
  const [cgTeamIdx, setCgTeamIdx] = useState(null);
  const [winner, setWinner] = useState(null);
  const [turnsUsed, setTurnsUsed] = useState([]);
  const [cd, setCd] = useState(0);
  const [paused, setPaused] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(true);
  const [startedAt, setStartedAt] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState(() => loadHistory());
  const [resumed, setResumed] = useState(false);
  const [disabledKeys, setDisabledKeys] = useState(() => loadDisabledPrompts());
  const [showPromptsManager, setShowPromptsManager] = useState(false);

  // Source of truth for active prompts during a draw — kept in a ref so
  // that even if pick() were called twice in the same tick, the second
  // call sees the first call's mutation. State mirrors stay reactive for
  // persistence and re-renders.
  const usedRef = useRef(new Set());
  const activeIndicesRef = useRef(null);
  const computeActiveIndices = (disabled) => {
    const out = [];
    for (let i = 0; i < PROMPTS.length; i++) {
      if (!disabled.has(promptKey(PROMPTS[i]))) out.push(i);
    }
    return out;
  };
  if (activeIndicesRef.current === null) {
    activeIndicesRef.current = computeActiveIndices(disabledKeys);
  }
  useEffect(() => {
    activeIndicesRef.current = computeActiveIndices(disabledKeys);
  }, [disabledKeys]);
  // Keep usedRef in sync with state (e.g. after hydration or newGame)
  useEffect(() => { usedRef.current = used; }, [used]);

  const enabledCount = activeIndicesRef.current?.length ?? PROMPTS.length;

  // Hydrate once on mount
  useEffect(() => {
    const s = loadCurrent();
    if (!s) return;
    setResumed(true);
    setNumTeams(s.numTeams); setTeamConfigs(s.teamConfigs); setTurnsPerPlayer(s.turnsPerPlayer);
    setTeams(s.teams); setUsed(s.used); usedRef.current = s.used;
    setPi(s.pi); setTarget(s.target); setNeedle(s.needle);
    // Per UX choice: skip the LOOK countdown on resume, jump to PSYCHIC
    setPh(s.ph === PH.LOOK ? PH.PSYCHIC : s.ph);
    setScores(s.scores); setRs(s.rs); setRd(s.rd); setAt(s.at);
    setCgDir(s.cgDir); setCgCorrect(s.cgCorrect); setCgTeamIdx(s.cgTeamIdx);
    setWinner(s.winner); setTurnsUsed(s.turnsUsed); setPaused(false);
    setSkipAvailable(s.skipAvailable ?? true);
    setStartedAt(s.startedAt);
  }, []);

  // Auto-dismiss resume toast
  useEffect(() => {
    if (!resumed) return;
    const t = setTimeout(() => setResumed(false), 3500);
    return () => clearTimeout(t);
  }, [resumed]);

  // Persist on relevant changes (skip SETUP/END and when no game in progress)
  useEffect(() => {
    if (ph === PH.SETUP || ph === PH.END || teams.length === 0) return;
    saveCurrent({
      startedAt, numTeams, teamConfigs, turnsPerPlayer, teams, used,
      pi, target, needle, ph, scores, rs, rd, at,
      cgDir, cgCorrect, cgTeamIdx, winner, turnsUsed, paused, skipAvailable,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- needle omitted: drag fires per pointer-move; persisted on next other change
  }, [
    startedAt, numTeams, teamConfigs, turnsPerPlayer, teams, used,
    pi, target, ph, scores, rs, rd, at,
    cgDir, cgCorrect, cgTeamIdx, winner, turnsUsed, paused, skipAvailable,
  ]);

  const activeTeams = teamConfigs.slice(0, numTeams);

  const updateTeamConfig = (idx, field, value) => {
    setTeamConfigs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  };

  const turnsPerTeam = (teams.length > 0 ? teams : activeTeams).map(t => (t?.players || 3) * turnsPerPlayer);
  const totalRounds = turnsPerTeam.reduce((a, b) => a + b, 0);

  const pick = useCallback(() => {
    const enabled = activeIndicesRef.current || [];
    // Available = enabled and not yet used this game (read from ref, not state — synchronous)
    let av = enabled.filter(i => !usedRef.current.has(i));
    // Deck exhausted — reshuffle
    if (av.length === 0) {
      usedRef.current = new Set();
      av = [...enabled];
    }
    // Edge case: zero enabled prompts (shouldn't happen — Start Game is gated)
    if (av.length === 0) av = PROMPTS.map((_, i) => i);
    const idx = av[Math.floor(Math.random() * av.length)];
    // Mutate the ref synchronously so subsequent calls in same tick see it
    const next = new Set(usedRef.current);
    next.add(idx);
    usedRef.current = next;
    setUsed(next);
    return idx;
  }, []);

  const beginLookAway = useCallback(() => {
    setPi(pick());
    setTarget(randomTarget());
    setNeedle(90);
    setRs(null); setCgDir(null); setCgCorrect(null); setCgTeamIdx(null);
    setSkipAvailable(true);
    setPaused(false);
    setRd(r => r + 1);
    setCd(LOOK_SECS);
    setPh(PH.LOOK);
  }, [pick]);

  // Countdown with pause support
  useEffect(() => {
    if (ph !== PH.LOOK || cd <= 0 || paused) return;
    const t = setTimeout(() => {
      if (cd <= 1) { setCd(0); setPh(PH.PSYCHIC); }
      else setCd(c => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [ph, cd, paused]);

  const togglePause = () => setPaused(p => !p);
  const hideTarget = () => setPh(PH.GUESS);

  // Hold-to-skip the LOOK countdown (designed so accidental taps don't skip)
  const SKIP_HOLD_MS = 800;
  const skipHoldTimer = useRef(null);
  const [skipHolding, setSkipHolding] = useState(false);
  const startSkipHold = useCallback(() => {
    if (ph !== PH.LOOK) return;
    setSkipHolding(true);
    skipHoldTimer.current = setTimeout(() => {
      skipHoldTimer.current = null;
      setSkipHolding(false);
      setCd(0);
      setPh(PH.PSYCHIC);
    }, SKIP_HOLD_MS);
  }, [ph]);
  const cancelSkipHold = useCallback(() => {
    if (skipHoldTimer.current) {
      clearTimeout(skipHoldTimer.current);
      skipHoldTimer.current = null;
    }
    setSkipHolding(false);
  }, []);
  // Clean up the timer if phase changes mid-hold
  useEffect(() => () => { if (skipHoldTimer.current) clearTimeout(skipHoldTimer.current); }, []);
  const lockGuess = () => setPh(PH.COUNTER);

  const skipPrompt = () => {
    if (!skipAvailable) return;
    setSkipAvailable(false);
    setPi(pick());
    setTarget(randomTarget());
    setNeedle(90);
  };

  const findNextTeam = useCallback((current, tu) => {
    const n = teams.length;
    for (let i = 1; i <= n; i++) {
      const idx = (current + i) % n;
      if (tu[idx] < teams[idx].players * turnsPerPlayer) return idx;
    }
    return -1;
  }, [teams, turnsPerPlayer]);

  // Counter-guess: only the NEXT team in rotation
  const counterTeamIdx = teams.length > 0 ? (at + 1) % teams.length : 0;

  const counterGuess = dir => {
    setCgDir(dir);
    setCgTeamIdx(counterTeamIdx);
    const s = getScore(needle, target);
    setRs(s);
    const actual = target < needle ? "left" : target > needle ? "right" : null;
    const correct = actual !== null && dir === actual;
    setCgCorrect(correct);

    setScores(prev => {
      const n = [...prev];
      n[at] += s;
      if (correct) n[counterTeamIdx] += 1;
      return n;
    });
    setTurnsUsed(prev => { const n = [...prev]; n[at] += 1; return n; });
    setPh(PH.REVEAL);
  };

  const endGame = useCallback((winnerIdx) => {
    appendHistory({
      startedAt: startedAt || Date.now(),
      endedAt: Date.now(),
      teams: teams.map(t => ({ name: t.name, hue: t.hue, players: t.players })),
      scores: [...scores],
      winnerIdx,
      turnsPerPlayer,
      roundsPlayed: rd,
    });
    setHistoryEntries(loadHistory());
    clearCurrent();
    setWinner(winnerIdx);
    setPh(PH.END);
  }, [startedAt, teams, scores, turnsPerPlayer, rd]);

  const nextRound = () => {
    const allDone = turnsUsed.every((tu, i) => tu >= teams[i].players * turnsPerPlayer);
    if (allDone) {
      const mx = Math.max(...scores);
      const ws = scores.map((s, i) => s === mx ? i : -1).filter(i => i >= 0);
      endGame(ws.length === 1 ? ws[0] : -1);
      return;
    }
    const nt = findNextTeam(at, turnsUsed);
    if (nt < 0) { endGame(-1); return; }
    setAt(nt);
    beginLookAway();
  };

  const newGame = () => {
    clearCurrent();
    usedRef.current = new Set();
    setScores([]); setRd(0); setAt(0); setUsed(new Set());
    setPi(null); setRs(null); setCgDir(null); setCgCorrect(null); setCgTeamIdx(null);
    setWinner(null); setTurnsUsed([]); setCd(0); setPaused(false);
    setSkipAvailable(true); setTeams([]); setStartedAt(null); setPh(PH.SETUP);
  };

  const requestNewGame = () => {
    setConfirmAction({
      title: "Start a new game?",
      message: "This ends the current game without recording it. Are you sure?",
      confirmLabel: "End & Start New",
      onConfirm: () => { newGame(); setConfirmAction(null); },
    });
  };

  const startGame = () => {
    const t = activeTeams.map(c => ({ ...c }));
    setTeams(t);
    setScores(t.map(() => 0));
    setTurnsUsed(t.map(() => 0));
    setRd(0); setAt(0); setWinner(null);
    setStartedAt(Date.now());
    beginLookAway();
  };

  const prompt = pi !== null ? PROMPTS[pi] : null;
  const tm = teams[at] || activeTeams[0];
  const tmS = ts(tm?.hue || 0);

  const currentTU = turnsUsed[at] || 0;
  const psychicNum = Math.min(Math.floor(currentTU / turnsPerPlayer) + 1, tm?.players || 1);
  const psychicTurn = (currentTU % turnsPerPlayer) + 1;
  const psychicLabel = `Player ${psychicNum}, turn ${psychicTurn}`;

  const counterTeam = teams[counterTeamIdx];
  const counterS = counterTeam ? ts(counterTeam.hue) : null;

  const btn = (bg, fg) => ({
    padding: "14px 32px", borderRadius: 999, border: "none",
    background: bg, color: fg || "#fff", fontSize: 15, fontWeight: 700,
    cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
  });
  const ghost = { ...btn("rgba(255,255,255,0.07)", "#94a3b8"), boxShadow: "none", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #141b2d 0%, #0b1018 70%)",
      fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
      color: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "20px 16px 48px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
@keyframes pulse-ring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}`}</style>

      {/* Top utility toolbar — sits above the logo so it never overlaps on mobile */}
      {((ph !== PH.SETUP && ph !== PH.END) || historyEntries.length > 0) && (
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          width: "100%", maxWidth: 600, marginBottom: 4,
        }}>
          {ph !== PH.SETUP && ph !== PH.END && (
            <button onClick={requestNewGame} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase",
            }}>New Game</button>
          )}
          {historyEntries.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase",
            }}>History ({historyEntries.length})</button>
          )}
        </div>
      )}

      <h1 style={{
        fontSize: "clamp(28px, 9vw, 40px)", fontWeight: 900,
        letterSpacing: "clamp(3px, 1.5vw, 8px)",
        margin: "0 0 16px", textTransform: "uppercase",
        background: "linear-gradient(135deg, #f472b6 0%, #818cf8 40%, #38bdf8 70%, #34d399 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Wavelength</h1>

      {/* Resume toast */}
      {resumed && (
        <div onClick={() => setResumed(false)} style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          padding: "8px 18px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.4)",
          color: "#7dd3fc", letterSpacing: 1, textTransform: "uppercase",
          zIndex: 90, cursor: "pointer", backdropFilter: "blur(8px)",
        }}>Resumed from earlier</div>
      )}

      {/* ═══════════ SETUP ═══════════ */}
      {ph === PH.SETUP && (
        <div style={{ textAlign: "center", maxWidth: 520, marginTop: 8, width: "100%" }}>
          <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 15, margin: "0 0 4px" }}>
            The <b style={{ color: "#e2e8f0" }}>Psychic</b> sees the target on the spectrum and gives a clue.
            Teammates drag the needle. The <b style={{ color: "#e2e8f0" }}>next team</b> guesses left or right for a bonus.
            The psychic gets <b style={{ color: "#e2e8f0" }}>one skip</b> per turn before hiding the target.
          </p>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>
            4 pts Bullseye · 3 pts Close · 2 pts Near · 0 Miss · +1 correct left/right
          </p>

          {/* Number of teams */}
          <div style={setupBox}>
            <div style={setupLabel}>Number of Teams</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <button onClick={() => setNumTeams(n => Math.max(2, n - 1))} style={stepBtn}>−</button>
              <span style={bigNum}>{numTeams}</span>
              <button onClick={() => setNumTeams(n => Math.min(6, n + 1))} style={stepBtn}>+</button>
            </div>
          </div>

          {/* Team configs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {activeTeams.map((t, i) => {
              const s = ts(t.hue);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderRadius: 14, background: s.bg, border: `1px solid ${s.border}`,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0,
                  }} />
                  <input
                    value={t.name}
                    onChange={e => updateTeamConfig(i, "name", e.target.value)}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, padding: "8px 12px", color: s.color, fontSize: 15, fontWeight: 700,
                      outline: "none", minWidth: 0,
                    }}
                    placeholder="Team name"
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateTeamConfig(i, "players", Math.max(1, t.players - 1))}
                      style={{ ...miniBtn, color: s.color }}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc", minWidth: 24, textAlign: "center" }}>{t.players}</span>
                    <button onClick={() => updateTeamConfig(i, "players", Math.min(10, t.players + 1))}
                      style={{ ...miniBtn, color: s.color }}>+</button>
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 48, textAlign: "right" }}>players</span>
                </div>
              );
            })}
          </div>

          {/* Turns per player */}
          <div style={setupBox}>
            <div style={setupLabel}>Turns per Player</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <button onClick={() => setTurnsPerPlayer(n => Math.max(1, n - 1))} style={stepBtn}>−</button>
              <span style={bigNum}>{turnsPerPlayer}</span>
              <button onClick={() => setTurnsPerPlayer(n => Math.min(5, n + 1))} style={stepBtn}>+</button>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "#475569", margin: "0 0 20px" }}>
            {activeTeams.reduce((sum, t) => sum + t.players * turnsPerPlayer, 0)} total rounds · {enabledCount} of {PROMPTS.length} prompts active
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={startGame}
              disabled={enabledCount === 0}
              style={{
                ...btn("#818cf8"),
                opacity: enabledCount === 0 ? 0.4 : 1,
                cursor: enabledCount === 0 ? "not-allowed" : "pointer",
              }}
            >Start Game</button>
            <button onClick={() => setShowPromptsManager(true)} style={ghost}>
              View Prompt Cards
            </button>
          </div>
          {enabledCount === 0 && (
            <p style={{ fontSize: 12, color: "#f87171", marginTop: 12 }}>
              All prompts disabled — enable at least one to play.
            </p>
          )}
        </div>
      )}

      {/* ═══════════ SCOREBOARD ═══════════ */}
      {ph !== PH.SETUP && teams.length > 0 && (
        <>
          <div style={{
            display: "flex", gap: 8, width: "100%", maxWidth: Math.min(teams.length * 130, 600),
            marginBottom: 10, justifyContent: "center",
          }}>
            {teams.map((t, i) => (
              <TeamCard key={i} t={t} s={ts(t.hue)} score={scores[i]}
                active={at === i && ph !== PH.END} won={winner === i}
                turnsUsed={turnsUsed[i]} turnsTotal={t.players * turnsPerPlayer} />
            ))}
          </div>
          {ph > PH.LOOK && ph < PH.END && (
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, letterSpacing: 1 }}>
              Round {rd} / {totalRounds}
            </div>
          )}
        </>
      )}

      {/* ═══════════ LOOK AWAY COUNTDOWN ═══════════ */}
      {ph === PH.LOOK && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px", textAlign: "center", marginTop: 8 }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            border: `4px solid ${paused ? "#475569" : tmS.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: paused ? "none" : `0 0 0 8px ${tmS.dim}, 0 0 40px ${tmS.dim}`,
            animation: paused ? "none" : "pulse-ring 1s ease-in-out infinite",
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}>
            <span style={{ fontSize: 60, fontWeight: 900, color: paused ? "#64748b" : tmS.color, lineHeight: 1, transition: "color 0.3s" }}>
              {paused ? "||" : cd}
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", marginBottom: 8, letterSpacing: 1 }}>
            {paused ? "PAUSED" : "EVERYONE LOOK AWAY"}
          </div>
          <div style={{ fontSize: 16, color: "#94a3b8", maxWidth: 420, lineHeight: 1.6 }}>
            <span style={{ color: tmS.color, fontWeight: 700 }}>{tm.name}</span>'s psychic
            <span style={{ color: tmS.accent }}> ({psychicLabel})</span>
            {paused ? " — resume when ready." : " is about to see the target. Everyone else, look away!"}
          </div>
          {!paused && (
            <div style={{ width: 240, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginTop: 24, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: tmS.color, width: `${(cd / LOOK_SECS) * 100}%`, transition: "width 1s linear" }} />
            </div>
          )}
          <button onClick={togglePause} style={{ ...ghost, marginTop: 24, padding: "10px 28px", fontSize: 14 }}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onPointerDown={startSkipHold}
            onPointerUp={cancelSkipHold}
            onPointerLeave={cancelSkipHold}
            onPointerCancel={cancelSkipHold}
            style={{
              marginTop: 10, padding: "6px 18px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)", color: "#475569",
              fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700,
              cursor: "pointer", position: "relative", overflow: "hidden",
              userSelect: "none", touchAction: "none", minWidth: 140,
            }}
          >
            <span aria-hidden="true" style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              background: tmS.dim,
              width: skipHolding ? "100%" : "0%",
              transition: skipHolding ? `width ${SKIP_HOLD_MS}ms linear` : "width 0.15s ease",
            }} />
            <span style={{ position: "relative" }}>
              {skipHolding ? "Keep holding…" : "Hold to skip"}
            </span>
          </button>
        </div>
      )}

      {/* ═══════════ GAME OVER ═══════════ */}
      {ph === PH.END && (
        <div style={{
          padding: "28px 44px", borderRadius: 24, textAlign: "center", marginTop: 8,
          background: winner >= 0 ? ts(teams[winner].hue).bg : "rgba(255,255,255,0.04)",
          border: `2px solid ${winner >= 0 ? ts(teams[winner].hue).color : "rgba(255,255,255,0.15)"}`,
          boxShadow: winner >= 0 ? `0 0 50px ${ts(teams[winner].hue).dim}` : "none",
        }}>
          <div style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>
            Game Over
          </div>
          {winner >= 0 ? (
            <div style={{ fontSize: 24, fontWeight: 900, color: ts(teams[winner].hue).color }}>
              {teams[winner].name} Wins
            </div>
          ) : (
            <div style={{ fontSize: 24, fontWeight: 900, color: "#e2e8f0" }}>Tie Game</div>
          )}
          <div style={{ color: "#94a3b8", fontSize: 16, marginTop: 8 }}>
            {scores.map((s, i) => `${teams[i].name}: ${s}`).join("   ·   ")}
          </div>
          <button onClick={newGame} style={{ ...btn(winner >= 0 ? ts(teams[winner].hue).color : "#818cf8"), marginTop: 20 }}>Play Again</button>
        </div>
      )}

      {/* ═══════════ CONFIRM MODAL ═══════════ */}
      {confirmAction && (
        <Modal onClose={() => setConfirmAction(null)}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>
            {confirmAction.title}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 22 }}>
            {confirmAction.message}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmAction(null)} style={ghost}>Cancel</button>
            <button onClick={confirmAction.onConfirm} style={btn("#ef4444")}>
              {confirmAction.confirmLabel || "Confirm"}
            </button>
          </div>
        </Modal>
      )}

      {/* ═══════════ HISTORY MODAL ═══════════ */}
      {showHistory && (
        <Modal onClose={() => setShowHistory(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>Game History</div>
            <button onClick={() => setShowHistory(false)} style={{
              background: "transparent", border: "none", color: "#64748b",
              fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1,
            }}>×</button>
          </div>
          {historyEntries.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 14, padding: "20px 0" }}>No games played yet.</div>
          ) : (
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {historyEntries.map((g, gi) => {
                const winnerName = g.winnerIdx >= 0 ? g.teams[g.winnerIdx]?.name : null;
                const winnerHue = g.winnerIdx >= 0 ? g.teams[g.winnerIdx]?.hue : 0;
                const ws = winnerName ? ts(winnerHue) : null;
                const date = new Date(g.endedAt);
                return (
                  <div key={gi} style={{
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ws ? ws.color : "#94a3b8" }}>
                        {winnerName ? `${winnerName} won` : "Tie game"}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
                      {g.teams.map((t, ti) => {
                        const s = ts(t.hue);
                        return (
                          <span key={ti} style={{ color: ti === g.winnerIdx ? s.color : "#94a3b8" }}>
                            {t.name}: <b style={{ color: ti === g.winnerIdx ? s.color : "#cbd5e1" }}>{g.scores[ti]}</b>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {historyEntries.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => {
                setShowHistory(false);
                setConfirmAction({
                  title: "Clear all history?",
                  message: `Permanently delete all ${historyEntries.length} past game${historyEntries.length === 1 ? "" : "s"}.`,
                  confirmLabel: "Delete All",
                  onConfirm: () => {
                    try { localStorage.removeItem(KEY_HISTORY); } catch { /* ignore */ }
                    setHistoryEntries([]);
                    setConfirmAction(null);
                  },
                });
              }} style={{ ...ghost, fontSize: 12, padding: "8px 16px" }}>Clear History</button>
            </div>
          )}
        </Modal>
      )}

      {/* ═══════════ PROMPTS MANAGER ═══════════ */}
      {showPromptsManager && (
        <PromptsManager
          initialDisabled={disabledKeys}
          onSave={(next) => {
            setDisabledKeys(next);
            saveDisabledPrompts(next);
            // Recompute active indices immediately so a game can start right away
            activeIndicesRef.current = computeActiveIndices(next);
          }}
          onClose={() => setShowPromptsManager(false)}
        />
      )}

      {/* ═══════════ ACTIVE GAME ═══════════ */}
      {(ph === PH.PSYCHIC || ph === PH.GUESS || ph === PH.COUNTER || ph === PH.REVEAL) && prompt && (
        <>
          <div style={{
            padding: "5px 20px", borderRadius: 999, marginBottom: 10,
            background: tmS.bg, border: `1px solid ${tmS.border}`,
            fontSize: 13, fontWeight: 700, color: tmS.color,
          }}>
            {tm.name} — {psychicLabel}
          </div>

          {/* SPECTRUM LABELS */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "stretch",
            width: "100%", maxWidth: 580, gap: 12, marginBottom: 6,
          }}>
            <div style={labelBox("#ef4444", "left")}>
              <span style={{ fontSize: 10, color: "#fca5a5", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Left</span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{prompt.left}</span>
            </div>
            <div style={labelBox("#22c55e", "right")}>
              <span style={{ fontSize: 10, color: "#86efac", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Right</span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{prompt.right}</span>
            </div>
          </div>

          <Dial
            needleAngle={needle} targetAngle={target}
            showTarget={ph === PH.PSYCHIC || ph === PH.REVEAL}
            onNeedleChange={setNeedle}
            locked={ph !== PH.GUESS}
            teamColor={tmS.color}
          />

          {/* BELOW DIAL */}
          <div style={{ width: "100%", maxWidth: 580, textAlign: "center", marginTop: 12 }}>

            {ph === PH.PSYCHIC && (
              <div style={{
                background: `${tmS.color}10`, border: `1px solid ${tmS.color}30`,
                borderRadius: 16, padding: "18px 28px", display: "inline-block", marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, color: tmS.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                  Psychic's View
                </div>
                <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 14 }}>
                  You can see the target. Think of a clue, then hide it for your team.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
                  <button onClick={hideTarget} style={btn(tmS.color)}>Hide for Guessers</button>
                  {skipAvailable ? (
                    <button onClick={skipPrompt} style={{
                      ...ghost,
                      position: "relative",
                      paddingRight: 42,
                    }}>
                      Skip Prompt
                      <span style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 800,
                        padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5,
                      }}>1</span>
                    </button>
                  ) : (
                    <div style={{
                      padding: "14px 24px", borderRadius: 999, fontSize: 13,
                      color: "#334155", border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.02)",
                    }}>
                      Skip used
                    </div>
                  )}
                </div>
              </div>
            )}

            {ph === PH.GUESS && (
              <>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 12px" }}>
                  <span style={{ color: tmS.color, fontWeight: 700 }}>{tm.name}</span>: drag the needle, then lock it in.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={lockGuess} style={btn(tmS.color)}>Lock In Guess</button>
                </div>
              </>
            )}

            {ph === PH.COUNTER && counterTeam && (
              <>
                <p style={{ color: counterS.accent, fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>
                  <span style={{ color: counterS.color }}>{counterTeam.name}</span>: is the target left or right of the needle?
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button onClick={() => counterGuess("left")} style={btn("#f59e0b", "#000")}>Left</button>
                  <button onClick={() => counterGuess("right")} style={btn("#22c55e", "#000")}>Right</button>
                </div>
              </>
            )}

            {ph === PH.REVEAL && rs !== null && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 12,
                  padding: "10px 24px", borderRadius: 999,
                  background: `${scoreClr(rs)}18`, border: `2px solid ${scoreClr(rs)}`,
                }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: scoreClr(rs) }}>+{rs}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>{scoreLbl(rs)}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>for {tm.name}</span>
                </div>
                {cgCorrect !== null && cgTeamIdx !== null && teams[cgTeamIdx] && (
                  <div style={{
                    padding: "6px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                    background: cgCorrect ? "#22c55e18" : "#ef444418",
                    border: `1px solid ${cgCorrect ? "#22c55e" : "#ef4444"}`,
                    color: cgCorrect ? "#4ade80" : "#f87171",
                  }}>
                    {teams[cgTeamIdx].name} guessed {cgDir} — {cgCorrect ? "+1 bonus" : "wrong"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button onClick={nextRound} style={btn("#818cf8")}>Next Round</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════════════════ */
const setupBox = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20, padding: "20px 24px", marginBottom: 16,
};
const setupLabel = {
  fontSize: 11, color: "#64748b", textTransform: "uppercase",
  letterSpacing: 3, marginBottom: 12, fontWeight: 700,
};
const bigNum = {
  fontSize: 48, fontWeight: 900, color: "#f8fafc",
  minWidth: 50, textAlign: "center", lineHeight: 1,
};
const stepBtn = {
  width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 22, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const miniBtn = {
  width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)", fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function labelBox(color, align) {
  return {
    flex: 1, display: "flex", flexDirection: "column", gap: 3,
    padding: "10px 14px", borderRadius: 14,
    background: `${color}10`, border: `1px solid ${color}25`,
    textAlign: align === "right" ? "right" : "left",
  };
}
