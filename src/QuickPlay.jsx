import { useState, useRef, useEffect } from "react";
import { PROMPTS, promptKey } from "./prompts";
import { Dial } from "./Dial";
import { ts, randomTarget, getScore, scoreLbl, scoreClr } from "./dialMath";

/* ═══════════════════════════════════════════════════════════════════
   QUICK PLAY
   No setup. Endless, cooperative pass-the-phone loop:
   one psychic gives a clue, everyone guesses, then the phone passes to
   the next person. Arbitrary number of players — we never ask how many.
   The group shares one running score (total / average / best round).
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "wavelength:quick";
const STORAGE_VERSION = 1;
const LOOK_SECS = 3; // snappy — this mode is all about momentum

const PH = {
  HANDOFF: 0, // "pass the phone — everyone look away"
  PSYCHIC: 1, // psychic sees target, gives clue
  GUESS: 2,   // group drags the needle
  REVEAL: 3,  // score + running tally
};

const QUICK_HUE = 38;          // amber energy — distinct from team (indigo) & couples (pink)
const GUESS_COLOR = "#38bdf8"; // sky — "the group's guess"

const EMPTY_SESSION = { total: 0, rounds: 0, best: 0, last: null };

function loadQuick() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== STORAGE_VERSION) return null;
    return d;
  } catch { return null; }
}
function saveQuick(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: STORAGE_VERSION }));
  } catch { /* ignore */ }
}
function clearQuick() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// Shuffled list of enabled prompt indices (Fisher-Yates).
function buildDeck(disabledKeys) {
  const out = [];
  for (let i = 0; i < PROMPTS.length; i++) {
    if (disabledKeys && disabledKeys.has(promptKey(PROMPTS[i]))) continue;
    out.push(i);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function QuickPlay({ onClose, disabledKeys }) {
  // Load any in-progress session once (pure read — StrictMode-safe).
  const [saved] = useState(() => loadQuick());

  const [session, setSession] = useState(() => saved?.session || { ...EMPTY_SESSION });
  const [ph, setPh] = useState(() => (saved ? saved.ph : PH.HANDOFF));
  const [pi, setPi] = useState(() => (saved ? saved.pi : null));
  const [target, setTarget] = useState(() => (saved ? saved.target : 90));
  const [needle, setNeedle] = useState(() => (saved ? saved.needle : 90));
  const [skipAvailable, setSkipAvailable] = useState(() => (saved ? saved.skipAvailable : true));
  const [cd, setCd] = useState(() => (saved && saved.ph === PH.HANDOFF ? LOOK_SECS : 0));

  // Deck of remaining prompt indices. On resume, drop any now-disabled prompts.
  const deckRef = useRef(
    saved?.deck
      ? saved.deck.filter(i => !(disabledKeys && disabledKeys.has(promptKey(PROMPTS[i]))))
      : null
  );

  const draw = () => {
    if (!deckRef.current || deckRef.current.length === 0) {
      deckRef.current = buildDeck(disabledKeys);
    }
    if (deckRef.current.length === 0) return null; // every prompt disabled
    return deckRef.current.shift();
  };

  const beginRound = () => {
    setPi(draw());
    setTarget(randomTarget());
    setNeedle(90);
    setSkipAvailable(true);
    setCd(LOOK_SECS);
    setPh(PH.HANDOFF);
  };

  // Kick off the first round on mount (only when not resuming). Ref guard keeps
  // it to a single run under StrictMode's double-invoked effects.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!saved) beginRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Look-away countdown
  useEffect(() => {
    if (ph !== PH.HANDOFF || cd <= 0) return;
    const t = setTimeout(() => {
      if (cd <= 1) { setCd(0); setPh(PH.PSYCHIC); }
      else setCd(c => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [ph, cd]);

  // Persist session + current round (needle omitted from deps: it fires per
  // pointer-move while dragging; it's still written on the next other change).
  useEffect(() => {
    saveQuick({ session, ph, pi, target, needle, skipAvailable, deck: deckRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, ph, pi, target, skipAvailable]);

  const hideTarget = () => setPh(PH.GUESS);

  const skipPrompt = () => {
    if (!skipAvailable) return;
    setSkipAvailable(false);
    setPi(draw());
    setTarget(randomTarget());
    setNeedle(90);
  };

  const lockGuess = () => {
    const s = getScore(needle, target);
    setSession(prev => ({
      total: prev.total + s,
      rounds: prev.rounds + 1,
      best: Math.max(prev.best, s),
      last: s,
    }));
    setPh(PH.REVEAL);
  };

  const endSession = () => {
    clearQuick();
    onClose();
  };

  const prompt = pi !== null ? PROMPTS[pi] : null;
  const accent = ts(QUICK_HUE);
  const avg = session.rounds > 0 ? (session.total / session.rounds) : 0;
  // Round number: while playing it's the round in progress; at reveal it's the
  // round we just finished (rounds was already incremented in lockGuess).
  const roundNo = ph === PH.REVEAL ? session.rounds : session.rounds + 1;

  // No enabled prompts at all — surface gracefully instead of a blank dial.
  if (prompt === null && ph !== PH.HANDOFF) {
    return (
      <div style={pageStyle}>
        <style>{cssAnimations}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 10 }}>No prompts available</div>
          <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 360, lineHeight: 1.6, marginBottom: 20 }}>
            Every prompt is disabled. Re-enable some in <b>View Prompt Cards</b> to play.
          </p>
          <button onClick={endSession} style={ghostBtn}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{cssAnimations}</style>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 600, marginBottom: 10 }}>
        <button onClick={endSession} style={{
          padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#94a3b8", cursor: "pointer", textTransform: "uppercase",
        }}>End</button>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: accent.color }}>⚡</span> Quick Play
        </div>
        <div style={{ fontSize: 11, color: accent.accent, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, minWidth: 50, textAlign: "right" }}>
          Round {roundNo}
        </div>
      </div>

      {/* Running tally */}
      <div style={{
        display: "flex", gap: 8, width: "100%", maxWidth: 600, marginBottom: 16,
      }}>
        <StatChip label="Total" value={session.total} primary />
        <StatChip label="Avg / round" value={session.rounds > 0 ? avg.toFixed(1) : "—"} />
        <StatChip label="Best" value={session.rounds > 0 ? `+${session.best}` : "—"} />
      </div>

      {/* ─── HANDOFF ─── */}
      {ph === PH.HANDOFF && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            border: `4px solid ${accent.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: `0 0 0 8px ${accent.dim}, 0 0 40px ${accent.dim}`,
            animation: "pulse-ring 1s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 60, fontWeight: 900, color: accent.color, lineHeight: 1 }}>{cd}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", marginBottom: 8, letterSpacing: 1 }}>
            Pass to the next <span style={{ color: accent.color }}>Psychic</span>
          </div>
          <div style={{ fontSize: 15, color: "#94a3b8", maxWidth: 420, lineHeight: 1.6 }}>
            Hand the phone to whoever's giving the clue. Everyone else, look away until the target's hidden.
          </div>
          <button onClick={() => { setCd(0); setPh(PH.PSYCHIC); }} style={{ ...ghostBtn, marginTop: 24, fontSize: 11 }}>
            Skip countdown
          </button>
        </div>
      )}

      {/* ─── PSYCHIC / GUESS / REVEAL ─── */}
      {(ph === PH.PSYCHIC || ph === PH.GUESS || ph === PH.REVEAL) && prompt && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
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
            teamColor={ph === PH.PSYCHIC ? accent.color : GUESS_COLOR}
          />

          <div style={{ width: "100%", maxWidth: 580, textAlign: "center", marginTop: 12 }}>
            {ph === PH.PSYCHIC && (
              <div style={{
                background: `${accent.color}10`, border: `1px solid ${accent.color}30`,
                borderRadius: 16, padding: "18px 28px", display: "inline-block", marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, color: accent.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                  Psychic's view
                </div>
                <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 14, maxWidth: 340 }}>
                  You can see the target. Say your clue out loud, then hide it for the guessers.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={hideTarget} style={primaryBtn(QUICK_HUE)}>Hide for guessers</button>
                  {skipAvailable ? (
                    <button onClick={skipPrompt} style={{ ...ghostBtn, position: "relative", paddingRight: 40 }}>
                      Skip prompt
                      <span style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 800,
                        padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5,
                      }}>1</span>
                    </button>
                  ) : (
                    <div style={{
                      padding: "10px 20px", borderRadius: 999, fontSize: 13,
                      color: "#334155", border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.02)",
                    }}>Skip used</div>
                  )}
                </div>
              </div>
            )}

            {ph === PH.GUESS && (
              <>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 12px" }}>
                  <span style={{ color: GUESS_COLOR, fontWeight: 700 }}>Everyone</span>: drag the needle to your guess, then lock it in.
                </p>
                <button onClick={lockGuess} style={primaryBtn(199)}>Lock In Guess</button>
              </>
            )}

            {ph === PH.REVEAL && session.last !== null && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 12,
                  padding: "12px 28px", borderRadius: 999,
                  background: `${scoreClr(session.last)}18`, border: `2px solid ${scoreClr(session.last)}`,
                  animation: "score-pop 0.5s cubic-bezier(.5,1.6,.5,1)",
                }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: scoreClr(session.last) }}>+{session.last}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{scoreLbl(session.last)}</span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {session.total} pts across {session.rounds} {session.rounds === 1 ? "round" : "rounds"}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button onClick={beginRound} style={primaryBtn(QUICK_HUE)}>Next round →</button>
                  <button onClick={endSession} style={ghostBtn}>End session</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ subcomponents ════════════════════════ */

function StatChip({ label, value, primary }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: "10px 8px", borderRadius: 14, textAlign: "center",
      background: primary ? `hsla(${QUICK_HUE},80%,55%,0.12)` : "rgba(255,255,255,0.04)",
      border: `1px solid ${primary ? `hsla(${QUICK_HUE},80%,55%,0.35)` : "rgba(255,255,255,0.08)"}`,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", fontWeight: 700, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: primary ? `hsl(${QUICK_HUE},80%,70%)` : "#f1f5f9", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

/* ═══════════════════════ shared styles ════════════════════════ */

const pageStyle = {
  position: "fixed", inset: 0, zIndex: 50,
  overflowY: "auto", overflowX: "hidden",
  background: "radial-gradient(ellipse at 50% 0%, #1f1a12 0%, #0b0a08 70%)",
  fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
  color: "#e2e8f0",
  display: "flex", flexDirection: "column", alignItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 14px max(48px, env(safe-area-inset-bottom))",
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
  color: "#0b0a08", cursor: "pointer",
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
@keyframes score-pop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
`;
