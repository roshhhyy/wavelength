import { useState, useRef, useEffect } from "react";
import { PROMPTS, promptKey } from "./prompts";
import { COUPLES_LEVELS, starsForScore } from "./levels";
import { Dial } from "./Dial";
import { ts, randomTarget, getScore, scoreLbl, scoreClr } from "./dialMath";

const STORAGE_KEY = "wavelength:couples";
const STORAGE_VERSION = 1;
const LOOK_SECS = 4; // slightly faster than team mode

const PH = {
  MENU: 0,
  HANDOFF: 1,   // "look away, hand to <psychic>"
  PSYCHIC: 2,   // psychic sees target, gives clue
  GUESS: 3,     // guesser drags needle
  REVEAL: 4,    // score animation
  WON: 5,
  LOST: 6,
};

// Player palette — pink for P1, teal for P2
const P1_HUE = 335;
const P2_HUE = 175;

function buildDeck(levelCfg, disabledKeys) {
  const eligible = [];
  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    if (disabledKeys && disabledKeys.has(promptKey(p))) continue;
    if (levelCfg.pool === "easy" && p.difficulty !== "easy") continue;
    if (levelCfg.pool === "hard" && p.difficulty !== "hard") continue;
    eligible.push(i);
  }
  // Fallback: if pool too narrow due to user disabling, fall back to any
  if (eligible.length < levelCfg.prompts) {
    const broader = [];
    for (let i = 0; i < PROMPTS.length; i++) {
      if (disabledKeys && disabledKeys.has(promptKey(PROMPTS[i]))) continue;
      broader.push(i);
    }
    eligible.push(...broader.filter(i => !eligible.includes(i)));
  }
  // Shuffle (Fisher-Yates)
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, levelCfg.prompts);
}

function loadCouples() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== STORAGE_VERSION) return null;
    return d;
  } catch { return null; }
}
function saveCouples(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: STORAGE_VERSION }));
  } catch { /* ignore */ }
}

// Star icon — filled or hollow
function Star({ filled, size = 22, color = "#facc15", delayMs = 0 }) {
  return (
    <span style={{
      display: "inline-block",
      transform: filled ? "scale(1)" : "scale(0.92)",
      animation: filled ? `star-pop 0.45s cubic-bezier(.5,1.6,.5,1) ${delayMs}ms backwards` : "none",
      filter: filled ? `drop-shadow(0 0 6px ${color}aa)` : "none",
      color: filled ? color : "rgba(255,255,255,0.18)",
      fontSize: size,
      lineHeight: 1,
    }}>★</span>
  );
}

export default function CouplesMode({ onClose, disabledKeys }) {
  // Persisted progress (loaded once)
  const initialSave = loadCouples();

  const [p1Name, setP1Name] = useState(initialSave?.p1Name || "Player 1");
  const [p2Name, setP2Name] = useState(initialSave?.p2Name || "Player 2");
  const [progress, setProgress] = useState(() => initialSave?.progress || {}); // { [level]: { stars, bestScore } }

  const [ph, setPh] = useState(PH.MENU);
  const [activeLevelIdx, setActiveLevelIdx] = useState(null); // index into COUPLES_LEVELS

  // Per-level run state
  const [score, setScore] = useState(0);
  const [promptsLeft, setPromptsLeft] = useState(0);
  const [usedRoundResults, setUsedRoundResults] = useState([]); // [{ left, right, needle, target, score }]
  const [psychicIsP1, setPsychicIsP1] = useState(true);

  // Per-round prompt/target/needle
  const [pi, setPi] = useState(null);
  const [target, setTarget] = useState(90);
  const [needle, setNeedle] = useState(90);

  // Look-away countdown
  const [cd, setCd] = useState(0);

  // Deck — array of remaining prompt indices for this run
  const deckRef = useRef([]);

  // Highest level unlocked: starts at 1, plus any beaten levels + 1
  const highestUnlocked = (() => {
    const beaten = Object.keys(progress).map(k => parseInt(k, 10)).filter(n => progress[n].stars > 0);
    if (beaten.length === 0) return 1;
    return Math.min(COUPLES_LEVELS.length, Math.max(...beaten) + 1);
  })();

  // Persist whenever names or progress change
  useEffect(() => {
    saveCouples({ p1Name, p2Name, progress });
  }, [p1Name, p2Name, progress]);

  // Look-away countdown
  useEffect(() => {
    if (ph !== PH.HANDOFF || cd <= 0) return;
    const t = setTimeout(() => {
      if (cd <= 1) { setCd(0); setPh(PH.PSYCHIC); }
      else setCd(c => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [ph, cd]);

  const beginFirstRound = (idx) => {
    const cfg = COUPLES_LEVELS[idx];
    deckRef.current = buildDeck(cfg, disabledKeys);
    setActiveLevelIdx(idx);
    setScore(0);
    setPromptsLeft(cfg.prompts);
    setUsedRoundResults([]);
    setPsychicIsP1(true);
    const firstIdx = deckRef.current.shift();
    setPi(firstIdx);
    setTarget(randomTarget());
    setNeedle(90);
    setCd(LOOK_SECS);
    setPh(PH.HANDOFF);
  };

  const beginNextRound = () => {
    const idx = deckRef.current.shift();
    setPi(idx);
    setTarget(randomTarget());
    setNeedle(90);
    setPsychicIsP1(p => !p);
    setCd(LOOK_SECS);
    setPh(PH.HANDOFF);
  };

  const hideTarget = () => setPh(PH.GUESS);

  const lockGuess = () => {
    const s = getScore(needle, target);
    const newScore = score + s;
    const newPromptsLeft = promptsLeft - 1;
    const cfg = COUPLES_LEVELS[activeLevelIdx];
    const result = {
      left: PROMPTS[pi].left,
      right: PROMPTS[pi].right,
      needle, target, score: s,
      psychic: psychicIsP1 ? p1Name : p2Name,
    };
    setScore(newScore);
    setPromptsLeft(newPromptsLeft);
    setUsedRoundResults(prev => [...prev, result]);
    setPh(PH.REVEAL);

    // Defer end-state transition so REVEAL renders first
    setTimeout(() => {
      if (newScore >= cfg.target) {
        finishLevel(newScore, true);
      } else if (newPromptsLeft <= 0) {
        finishLevel(newScore, false);
      }
    }, 0);
  };

  const finishLevel = (finalScore, won) => {
    if (won) {
      const cfg = COUPLES_LEVELS[activeLevelIdx];
      const stars = starsForScore(cfg, finalScore);
      const prev = progress[cfg.level];
      const bestScore = Math.max(prev?.bestScore || 0, finalScore);
      const bestStars = Math.max(prev?.stars || 0, stars);
      setProgress(p => ({
        ...p,
        [cfg.level]: { stars: bestStars, bestScore },
      }));
    }
    // Don't switch out of REVEAL immediately; only switch on user click
    // We'll show a banner at REVEAL that transitions via click.
    void won;
    void finalScore;
  };

  const proceedFromReveal = () => {
    const cfg = COUPLES_LEVELS[activeLevelIdx];
    if (promptsLeft <= 0) {
      setPh(score >= cfg.target ? PH.WON : PH.LOST);
      return;
    }
    beginNextRound();
  };

  const endLevelEarly = () => {
    const cfg = COUPLES_LEVELS[activeLevelIdx];
    setPh(score >= cfg.target ? PH.WON : PH.LOST);
  };

  const backToMenu = () => {
    setPh(PH.MENU);
    setActiveLevelIdx(null);
  };

  const cfg = activeLevelIdx !== null ? COUPLES_LEVELS[activeLevelIdx] : null;
  const prompt = pi !== null ? PROMPTS[pi] : null;
  const psychicName = psychicIsP1 ? p1Name : p2Name;
  const guesserName = psychicIsP1 ? p2Name : p1Name;
  const psychicHue = psychicIsP1 ? P1_HUE : P2_HUE;
  const psychicS = ts(psychicHue);
  const guesserS = ts(psychicIsP1 ? P2_HUE : P1_HUE);

  const targetReached = cfg && score >= cfg.target;
  const progressPct = cfg ? Math.min(100, (score / cfg.target) * 100) : 0;

  // ─── MENU SCREEN ──────────────────────────────────────────────────
  if (ph === PH.MENU) {
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 540, marginBottom: 8 }}>
          <button onClick={onClose} style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#94a3b8", cursor: "pointer", textTransform: "uppercase",
          }}>← Back</button>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase" }}>
            Couples Mode
          </div>
          <span style={{ width: 50 }} />
        </div>

        <h1 style={titleStyle}>
          <span style={{ color: `hsl(${P1_HUE},80%,70%)` }}>♥</span>
          <span style={{ marginLeft: 12, marginRight: 12 }}>Couples</span>
          <span style={{ color: `hsl(${P2_HUE},80%,70%)` }}>♥</span>
        </h1>

        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, textAlign: "center", maxWidth: 480, margin: "0 0 24px" }}>
          You and your partner take turns being the psychic. Hit the target score before you run out of prompts. Levels get tighter as you climb.
        </p>

        {/* Names */}
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 540, marginBottom: 24 }}>
          <NameInput value={p1Name} onChange={setP1Name} hue={P1_HUE} />
          <NameInput value={p2Name} onChange={setP2Name} hue={P2_HUE} />
        </div>

        {/* Level grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
          gap: 8, width: "100%", maxWidth: 540, marginBottom: 24,
        }}>
          {COUPLES_LEVELS.map((lvl, idx) => {
            const unlocked = lvl.level <= highestUnlocked;
            const prog = progress[lvl.level];
            const stars = prog?.stars || 0;
            const isMythic = idx === COUPLES_LEVELS.length - 1;
            return (
              <button
                key={lvl.level}
                onClick={() => unlocked && beginFirstRound(idx)}
                disabled={!unlocked}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "12px 8px", borderRadius: 14,
                  background: unlocked
                    ? (isMythic ? "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(244,114,182,0.18))" : "rgba(255,255,255,0.04)")
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${unlocked ? (isMythic ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.04)"}`,
                  color: unlocked ? "#e2e8f0" : "#475569",
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: unlocked ? 1 : 0.5,
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => unlocked && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => unlocked && (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>
                  {isMythic ? "Mythic" : `Level ${lvl.level}`}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                  {unlocked ? lvl.level : "🔒"}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {lvl.target} pts · {lvl.prompts} cards
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {[1, 2, 3].map(n => <Star key={n} filled={stars >= n} size={14} />)}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={() => beginFirstRound(highestUnlocked - 1)} style={primaryBtn(P1_HUE)}>
          {highestUnlocked === 1 && !progress[1] ? "Start Level 1" : `Continue · Level ${highestUnlocked}`}
        </button>
      </div>
    );
  }

  // ─── HANDOFF ──────────────────────────────────────────────────────
  if (ph === PH.HANDOFF) {
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>
        <ScoreHeader cfg={cfg} score={score} promptsLeft={promptsLeft} progressPct={progressPct} targetReached={targetReached} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            border: `4px solid ${psychicS.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: `0 0 0 8px ${psychicS.dim}, 0 0 40px ${psychicS.dim}`,
            animation: "pulse-ring 1s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 60, fontWeight: 900, color: psychicS.color, lineHeight: 1 }}>{cd}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", marginBottom: 8, letterSpacing: 1, textAlign: "center" }}>
            <span style={{ color: psychicS.color }}>{psychicName}</span>'s turn
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
            <span style={{ color: guesserS.color, fontWeight: 700 }}>{guesserName}</span>, look away while the target appears.
          </div>
          <button onClick={() => { setCd(0); setPh(PH.PSYCHIC); }} style={{
            ...ghostBtn, marginTop: 24, fontSize: 11,
          }}>Skip countdown</button>
        </div>
      </div>
    );
  }

  // ─── PSYCHIC / GUESS / REVEAL ─────────────────────────────────────
  if (ph === PH.PSYCHIC || ph === PH.GUESS || ph === PH.REVEAL) {
    const lastResult = usedRoundResults[usedRoundResults.length - 1];
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>
        <ScoreHeader cfg={cfg} score={score} promptsLeft={promptsLeft} progressPct={progressPct} targetReached={targetReached} />

        <div style={{ padding: "5px 16px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            padding: "5px 18px", borderRadius: 999, marginBottom: 10,
            background: psychicS.bg, border: `1px solid ${psychicS.border}`,
            fontSize: 12, fontWeight: 700, color: psychicS.color,
          }}>
            Psychic: {psychicName}
          </div>

          {/* Spectrum labels */}
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
            teamColor={ph === PH.GUESS ? guesserS.color : psychicS.color}
          />

          <div style={{ width: "100%", maxWidth: 580, textAlign: "center", marginTop: 12 }}>
            {ph === PH.PSYCHIC && (
              <div style={{
                background: `${psychicS.color}10`, border: `1px solid ${psychicS.color}30`,
                borderRadius: 16, padding: "18px 28px", display: "inline-block", marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, color: psychicS.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                  Psychic's view
                </div>
                <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 14, maxWidth: 320 }}>
                  See the target, give your clue out loud, then hide.
                </div>
                <button onClick={hideTarget} style={primaryBtn(psychicHue)}>Hide for {guesserName}</button>
              </div>
            )}
            {ph === PH.GUESS && (
              <>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 12px" }}>
                  <span style={{ color: guesserS.color, fontWeight: 700 }}>{guesserName}</span>: drag the needle, then lock it.
                </p>
                <button onClick={lockGuess} style={primaryBtn(psychicIsP1 ? P2_HUE : P1_HUE)}>Lock In</button>
              </>
            )}
            {ph === PH.REVEAL && lastResult && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 12,
                  padding: "12px 28px", borderRadius: 999,
                  background: `${scoreClr(lastResult.score)}18`, border: `2px solid ${scoreClr(lastResult.score)}`,
                  animation: "score-pop 0.5s cubic-bezier(.5,1.6,.5,1)",
                }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: scoreClr(lastResult.score) }}>+{lastResult.score}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{scoreLbl(lastResult.score)}</span>
                </div>
                {targetReached && promptsLeft > 0 ? (
                  <>
                    <div style={{
                      fontSize: 12, color: "#86efac", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700,
                      marginTop: 2,
                    }}>
                      Target hit! {[1,2,3].map(n => <Star key={n} filled={starsForScore(cfg, score) >= n} size={13} />)}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                      <button onClick={endLevelEarly} style={ghostBtn}>End level</button>
                      <button onClick={beginNextRound} style={primaryBtn(P2_HUE)}>Push for more stars →</button>
                    </div>
                  </>
                ) : (
                  <button onClick={proceedFromReveal} style={primaryBtn(P1_HUE)}>
                    {promptsLeft <= 0 ? "See result" : "Next prompt"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── WON ──────────────────────────────────────────────────────────
  if (ph === PH.WON) {
    const stars = starsForScore(cfg, score);
    const isLast = activeLevelIdx === COUPLES_LEVELS.length - 1;
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, width: "100%" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: "#86efac", marginBottom: 6, fontWeight: 700, animation: "fade-in 0.4s ease" }}>
            Level {cfg.level} cleared
          </div>
          <h1 style={{
            fontSize: "clamp(34px, 10vw, 56px)", margin: "4px 0 18px", fontWeight: 900, letterSpacing: 4, textTransform: "uppercase",
            background: "linear-gradient(135deg, #f472b6, #818cf8, #34d399)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "fade-in 0.4s ease 0.1s backwards",
          }}>{stars === 3 ? "Perfect!" : stars === 2 ? "Excellent!" : "Got it!"}</h1>

          <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
            <Star filled={stars >= 1} size={56} delayMs={200} />
            <Star filled={stars >= 2} size={56} delayMs={400} />
            <Star filled={stars >= 3} size={56} delayMs={600} />
          </div>

          <div style={{ display: "flex", gap: 24, marginBottom: 24, animation: "fade-in 0.4s ease 0.7s backwards" }}>
            <Stat label="Score" value={score} />
            <Stat label="Target" value={cfg.target} muted />
            <Stat label="Prompts left" value={cfg.prompts - usedRoundResults.length} muted />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", animation: "fade-in 0.4s ease 0.9s backwards" }}>
            {!isLast && <button onClick={() => beginFirstRound(activeLevelIdx + 1)} style={primaryBtn(P1_HUE)}>Next level →</button>}
            <button onClick={() => beginFirstRound(activeLevelIdx)} style={ghostBtn}>Replay</button>
            <button onClick={backToMenu} style={ghostBtn}>Back to levels</button>
          </div>

          {/* Round breakdown */}
          <details style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
            <summary style={{ cursor: "pointer", fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", listStyle: "none" }}>
              Round breakdown ▾
            </summary>
            <RoundBreakdown rounds={usedRoundResults} />
          </details>
        </div>
      </div>
    );
  }

  // ─── LOST ─────────────────────────────────────────────────────────
  if (ph === PH.LOST) {
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, width: "100%" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: "#fca5a5", marginBottom: 6, fontWeight: 700 }}>
            Level {cfg.level} failed
          </div>
          <h1 style={{
            fontSize: "clamp(30px, 8vw, 44px)", margin: "4px 0 16px", fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: "#f8fafc",
          }}>Out of prompts</h1>

          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            <Stat label="Score" value={score} />
            <Stat label="Needed" value={cfg.target} muted />
            <Stat label="Short by" value={cfg.target - score} accent="#f87171" />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => beginFirstRound(activeLevelIdx)} style={primaryBtn(P1_HUE)}>Try again</button>
            <button onClick={backToMenu} style={ghostBtn}>Back to levels</button>
          </div>

          <details style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
            <summary style={{ cursor: "pointer", fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", listStyle: "none" }}>
              Round breakdown ▾
            </summary>
            <RoundBreakdown rounds={usedRoundResults} />
          </details>
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════ subcomponents ════════════════════════ */

function ScoreHeader({ cfg, score, promptsLeft, progressPct, targetReached }) {
  return (
    <div style={{
      width: "100%", maxWidth: 600, padding: "0 4px", marginBottom: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
        <span>Level {cfg.level}</span>
        <span style={{ color: targetReached ? "#86efac" : "#cbd5e1" }}>
          {score} <span style={{ color: "#475569" }}>/ {cfg.target}</span>
        </span>
        <span style={{ color: promptsLeft <= 1 ? "#fbbf24" : "#cbd5e1" }}>
          {promptsLeft} {promptsLeft === 1 ? "prompt" : "prompts"} left
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 999,
          background: targetReached
            ? "linear-gradient(90deg, #34d399, #86efac)"
            : `linear-gradient(90deg, hsl(${P1_HUE}, 70%, 60%), hsl(${P2_HUE}, 70%, 60%))`,
          width: `${progressPct}%`,
          transition: "width 0.5s cubic-bezier(.4,1.4,.5,1)",
          boxShadow: targetReached ? "0 0 12px #34d39988" : "none",
        }} />
      </div>
    </div>
  );
}

function NameInput({ value, onChange, hue }) {
  const s = ts(hue);
  return (
    <div style={{
      flex: 1, padding: "10px 14px", borderRadius: 12,
      background: s.bg, border: `1px solid ${s.border}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={20}
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: s.color, fontSize: 15, fontWeight: 700, fontFamily: "inherit",
          minWidth: 0,
        }}
        placeholder="Name"
      />
    </div>
  );
}

function Stat({ label, value, muted, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent || (muted ? "#64748b" : "#f8fafc"), lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function RoundBreakdown({ rounds }) {
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      {rounds.map((r, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 12,
        }}>
          <span style={{
            width: 28, fontWeight: 800, color: scoreClr(r.score), textAlign: "center", flexShrink: 0,
          }}>+{r.score}</span>
          <span style={{ flex: 1, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.left} <span style={{ color: "#475569" }}>↔</span> {r.right}
          </span>
          <span style={{ fontSize: 10, color: "#64748b", flexShrink: 0 }}>{r.psychic}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════ shared styles ════════════════════════ */

const pageStyle = {
  position: "fixed", inset: 0, zIndex: 50,
  overflowY: "auto", overflowX: "hidden",
  background: "radial-gradient(ellipse at 50% 0%, #1f1d2e 0%, #0b0a14 70%)",
  fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
  color: "#e2e8f0",
  display: "flex", flexDirection: "column", alignItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 14px max(48px, env(safe-area-inset-bottom))",
};

const titleStyle = {
  fontSize: "clamp(32px, 9vw, 48px)",
  fontWeight: 900,
  letterSpacing: "clamp(2px, 1vw, 5px)",
  margin: "8px 0 12px",
  textTransform: "uppercase",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg, #f472b6 0%, #c4b5fd 50%, #5eead4 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textAlign: "center",
};

const ghostBtn = {
  padding: "10px 20px", borderRadius: 999,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
  fontFamily: "inherit",
};

const primaryBtn = (hue) => ({
  padding: "13px 28px", borderRadius: 999, border: "none",
  background: `hsl(${hue}, 80%, 65%)`,
  color: "#0b0a14", cursor: "pointer",
  fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
  boxShadow: `0 6px 24px hsla(${hue}, 80%, 50%, 0.4)`,
  fontFamily: "inherit",
});

function labelBox(color, align) {
  return {
    flex: 1, display: "flex", flexDirection: "column", gap: 3,
    padding: "10px 14px", borderRadius: 14,
    background: `${color}10`, border: `1px solid ${color}25`,
    textAlign: align === "right" ? "right" : "left",
  };
}

const cssAnimations = `
@keyframes pulse-ring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}
@keyframes star-pop{0%{transform:scale(0) rotate(-180deg);opacity:0}60%{transform:scale(1.2) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes score-pop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes fade-in{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
`;
