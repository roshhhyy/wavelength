import { useState, useRef, useCallback, useEffect } from "react";

const PROMPTS = [
  ["Terrible superpower","Amazing superpower"],["Worst way to die","Best way to die"],
  ["Bad pizza topping","Great pizza topping"],["Forgettable movie","Unforgettable movie"],
  ["Boring hobby","Fascinating hobby"],["Useless invention","World-changing invention"],
  ["Awful first date","Perfect first date"],["Terrible pet","Perfect pet"],
  ["Bad thing to say at a wedding","Great thing to say at a wedding"],["Overrated","Underrated"],
  ["Worst smell","Best smell"],["Bad Halloween costume","Iconic Halloween costume"],
  ["Nobody wants this skill","Everyone wants this skill"],["Terrible band name","Incredible band name"],
  ["Worst celebrity to be stuck in an elevator with","Best celebrity to be stuck in an elevator with"],
  ["Bad life advice","Great life advice"],["Least cool animal","Coolest animal"],
  ["Worst thing to find in your pocket","Best thing to find in your pocket"],
  ["Terrible restaurant theme","Amazing restaurant theme"],["Not impressive at all","Extremely impressive"],
  ["Worst thing to be famous for","Best thing to be famous for"],
  ["Bad vacation destination","Dream vacation destination"],
  ["Least satisfying sound","Most satisfying sound"],["Terrible middle name","Awesome middle name"],
  ["Worst age to be","Best age to be"],["Bad thing to automate","Great thing to automate"],
  ["Least romantic gesture","Most romantic gesture"],
  ["Worst food to eat on a first date","Best food to eat on a first date"],
  ["Useless in a zombie apocalypse","Essential in a zombie apocalypse"],
  ["Bad tattoo idea","Great tattoo idea"],["Worst Olympic sport to add","Best Olympic sport to add"],
  ["Least intimidating","Most intimidating"],
  ["Terrible thing to whisper to a stranger","OK thing to whisper to a stranger"],
  ["Worst historical era to live in","Best historical era to live in"],
  ["Least fun game","Most fun game"],["Bad reason to call 911","Good reason to call 911"],
  ["Worst thing to step on barefoot","Best thing to step on barefoot"],
  ["Least useful school subject","Most useful school subject"],
  ["Worst thing to forget","Best thing to forget"],["Terrible Wi-Fi password","Clever Wi-Fi password"],
  ["Worst way to start a speech","Best way to start a speech"],["Least relaxing","Most relaxing"],
  ["Bad thing to collect","Cool thing to collect"],["Worst song to wake up to","Best song to wake up to"],
  ["Terrible party theme","Amazing party theme"],
  ["Least trustworthy profession","Most trustworthy profession"],
  ["Worst thing to drop from a building","Funniest thing to drop from a building"],
  ["Bad name for a boat","Perfect name for a boat"],["Least photogenic","Most photogenic"],
  ["Worst excuse for being late","Most creative excuse for being late"],
  ["Terrible ice cream flavor","Best ice cream flavor"],
  ["Least rewatchable movie","Most rewatchable movie"],["Bad last words","Legendary last words"],
  ["Worst way to propose","Best way to propose"],["Least comforting","Most comforting"],
  ["Terrible thing to put on a resume","Impressive thing to put on a resume"],
  ["Worst thing to say to your boss","Best thing to say to your boss"],
  ["Least cool way to arrive","Coolest way to arrive"],
  ["Bad thing to yell in a library","OK thing to yell in a library"],
  ["Worst childhood memory","Best childhood memory"],
  ["Least appetizing food color","Most appetizing food color"],
  ["Terrible password","Uncrackable password"],
  ["Worst ride at a theme park","Best ride at a theme park"],
  ["Least charismatic","Most charismatic"],["Bad thing to name your child","Great thing to name your child"],
  ["Worst item to have only one of","Best item to have only one of"],
  ["Least useful kitchen gadget","Most useful kitchen gadget"],
  ["Terrible thing to say in a job interview","Perfect thing to say in a job interview"],
  ["Worst breakfast food","Best breakfast food"],["Least scary monster","Most terrifying monster"],
  ["Bad road trip car","Perfect road trip car"],["Worst compliment","Best compliment"],
  ["Least useful app","Most useful app"],["Terrible alarm sound","Perfect alarm sound"],
  ["Worst thing to sit next to on a plane","Best thing to sit next to on a plane"],
  ["Least fun chore","Most satisfying chore"],
  ["Bad thing to be allergic to","Good thing to be allergic to"],
  ["Worst conspiracy theory","Most believable conspiracy theory"],["Least festive","Most festive"],
  ["Terrible thing to automate with AI","Perfect thing to automate with AI"],
  ["Worst sandwich filling","Best sandwich filling"],
  ["Least athletic activity","Most athletic activity"],
  ["Bad theme for a wedding","Amazing theme for a wedding"],
  ["Worst thing to lose","Best thing to lose"],["Least funny joke topic","Funniest joke topic"],
  ["Terrible thing to 3D print","Coolest thing to 3D print"],
  ["Worst museum exhibit","Best museum exhibit"],["Least portable","Most portable"],
  ["Bad thing to bring camping","Essential thing to bring camping"],
  ["Worst text to send to the wrong person","Harmless text to send to the wrong person"],
  ["Least dramatic","Most dramatic"],["Terrible trivia category","Best trivia category"],
  ["Worst way to spend a million dollars","Best way to spend a million dollars"],
  ["Least nostalgic","Most nostalgic"],
  ["Bad thing to do in zero gravity","Awesome thing to do in zero gravity"],
  ["Worst thing to run out of","Best thing to run out of"],["Least iconic","Most iconic"],
  ["Terrible voicemail greeting","Best voicemail greeting"],
  ["Worst thing to discover about your neighbor","Best thing to discover about your neighbor"],
  ["Least futuristic","Most futuristic"],
];

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
  const dragging = useRef(false);

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
    e.preventDefault(); dragging.current = true;
    const p = e.touches ? e.touches[0] : e;
    onNeedleChange(ptrToAngle(p.clientX, p.clientY));
  }, [locked, onNeedleChange, ptrToAngle]);

  const move = useCallback(e => {
    if (!dragging.current || locked) return;
    e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    onNeedleChange(ptrToAngle(p.clientX, p.clientY));
  }, [locked, onNeedleChange, ptrToAngle]);

  const up = useCallback(() => { dragging.current = false; }, []);

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
        style={{ filter: `drop-shadow(0 0 10px ${teamColor}88)`, transition: dragging.current ? "none" : "all 0.08s ease" }} />
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

  const activeTeams = teamConfigs.slice(0, numTeams);

  const updateTeamConfig = (idx, field, value) => {
    setTeamConfigs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  };

  const turnsPerTeam = (teams.length > 0 ? teams : activeTeams).map(t => (t?.players || 3) * turnsPerPlayer);
  const totalRounds = turnsPerTeam.reduce((a, b) => a + b, 0);

  const pick = useCallback(() => {
    let av = PROMPTS.map((_, i) => i).filter(i => !used.has(i));
    if (!av.length) { setUsed(new Set()); av = PROMPTS.map((_, i) => i); }
    const idx = av[Math.floor(Math.random() * av.length)];
    setUsed(p => new Set([...p, idx]));
    return idx;
  }, [used]);

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

  const nextRound = () => {
    const allDone = turnsUsed.every((tu, i) => tu >= teams[i].players * turnsPerPlayer);
    if (allDone) {
      const mx = Math.max(...scores);
      const ws = scores.map((s, i) => s === mx ? i : -1).filter(i => i >= 0);
      setWinner(ws.length === 1 ? ws[0] : -1);
      setPh(PH.END);
      return;
    }
    const nt = findNextTeam(at, turnsUsed);
    if (nt < 0) { setPh(PH.END); return; }
    setAt(nt);
    beginLookAway();
  };

  const newGame = () => {
    setScores([]); setRd(0); setAt(0); setUsed(new Set());
    setPi(null); setRs(null); setCgDir(null); setCgCorrect(null); setCgTeamIdx(null);
    setWinner(null); setTurnsUsed([]); setCd(0); setPaused(false);
    setSkipAvailable(true); setTeams([]); setPh(PH.SETUP);
  };

  const startGame = () => {
    const t = activeTeams.map(c => ({ ...c }));
    setTeams(t);
    setScores(t.map(() => 0));
    setTurnsUsed(t.map(() => 0));
    setRd(0); setAt(0); setWinner(null);
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

      <h1 style={{
        fontSize: 40, fontWeight: 900, letterSpacing: 8, margin: "0 0 16px", textTransform: "uppercase",
        background: "linear-gradient(135deg, #f472b6 0%, #818cf8 40%, #38bdf8 70%, #34d399 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Wavelength</h1>

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

          {/* Turns per player */}
          <div style={setupBox}>
            <div style={setupLabel}>Turns per Player</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <button onClick={() => setTurnsPerPlayer(n => Math.max(1, n - 1))} style={stepBtn}>−</button>
              <span style={bigNum}>{turnsPerPlayer}</span>
              <button onClick={() => setTurnsPerPlayer(n => Math.min(5, n + 1))} style={stepBtn}>+</button>
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

          <p style={{ fontSize: 12, color: "#475569", margin: "0 0 20px" }}>
            {activeTeams.reduce((sum, t) => sum + t.players * turnsPerPlayer, 0)} total rounds
          </p>

          <button onClick={startGame} style={btn("#818cf8")}>Start Game</button>
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
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{prompt[0]}</span>
            </div>
            <div style={labelBox("#22c55e", "right")}>
              <span style={{ fontSize: 10, color: "#86efac", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Right</span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{prompt[1]}</span>
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
                  <button onClick={newGame} style={ghost}>New Game</button>
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
