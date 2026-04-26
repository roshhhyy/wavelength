import { useState, useRef, useCallback, useEffect } from "react";
import { CX, CY, R, IR, deg2rad, clamp } from "./dialMath";

export function Dial({ needleAngle, targetAngle, showTarget, onNeedleChange, locked, teamColor }) {
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
