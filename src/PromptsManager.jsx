import { useState, useMemo, useEffect } from "react";
import { PROMPTS, CATEGORIES, promptKey } from "./prompts";

const DIFF_STYLES = {
  easy: { label: "EASY", bg: "rgba(34,197,94,0.12)", color: "#86efac", border: "#22c55e40" },
  hard: { label: "HARD", bg: "rgba(168,85,247,0.12)", color: "#d8b4fe", border: "#a855f740" },
};

function ToggleDot({ on, color }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
      background: on ? color : "transparent",
      border: `2px solid ${on ? color : "#475569"}`,
      transition: "all 0.15s",
      position: "relative",
    }}>
      {on && <div style={{
        position: "absolute", inset: 4, borderRadius: "50%",
        background: "#fff",
      }} />}
    </div>
  );
}

function PromptCard({ prompt, enabled, onToggle, categoryColor }) {
  const diff = DIFF_STYLES[prompt.difficulty];
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "10px 14px", borderRadius: 12,
        background: enabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
        border: `1px solid ${enabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
        cursor: "pointer", textAlign: "left", color: "inherit", fontFamily: "inherit",
        opacity: enabled ? 1 : 0.45,
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = enabled ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = enabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)"; }}
    >
      <ToggleDot on={enabled} color={categoryColor} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#e2e8f0" }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prompt.left}
          </span>
          <span style={{ color: "#475569", flexShrink: 0 }}>↔</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prompt.right}
          </span>
        </div>
      </div>
      <div style={{
        padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: 1,
        background: diff.bg, color: diff.color, border: `1px solid ${diff.border}`, flexShrink: 0,
      }}>
        {diff.label}
      </div>
    </button>
  );
}

export default function PromptsManager({ initialDisabled, onSave, onClose }) {
  const [draft, setDraft] = useState(() => new Set(initialDisabled));
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [confirmClose, setConfirmClose] = useState(false);

  const toggleCollapse = (catKey) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(catKey)) next.delete(catKey);
      else next.add(catKey);
      return next;
    });
  };
  const collapseAll = () => setCollapsed(new Set(Object.keys(CATEGORIES)));
  const expandAll = () => setCollapsed(new Set());

  // Group prompts by category, preserving file order within each
  const grouped = useMemo(() => {
    const out = {};
    Object.keys(CATEGORIES).forEach(c => { out[c] = []; });
    PROMPTS.forEach(p => {
      if (!out[p.category]) out[p.category] = [];
      out[p.category].push(p);
    });
    return out;
  }, []);

  const dirty = useMemo(() => {
    if (draft.size !== initialDisabled.size) return true;
    for (const k of draft) if (!initialDisabled.has(k)) return true;
    return false;
  }, [draft, initialDisabled]);

  const enabledCount = PROMPTS.length - draft.size;

  const togglePrompt = (p) => {
    const k = promptKey(p);
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const setCategory = (cat, enable) => {
    setDraft(prev => {
      const next = new Set(prev);
      grouped[cat].forEach(p => {
        const k = promptKey(p);
        if (enable) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const setAll = (enable) => {
    setDraft(() => enable ? new Set() : new Set(PROMPTS.map(promptKey)));
  };

  const setByDifficulty = (difficulty, enable) => {
    setDraft(prev => {
      const next = new Set(prev);
      PROMPTS.filter(p => p.difficulty === difficulty).forEach(p => {
        const k = promptKey(p);
        if (enable) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const handleSave = () => { onSave(draft); onClose(); };
  const handleClose = () => {
    if (dirty) setConfirmClose(true);
    else onClose();
  };

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "radial-gradient(ellipse at 50% 0%, #141b2d 0%, #0b1018 70%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
      color: "#e2e8f0",
    }}>
      {/* Header (sticky top) */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "linear-gradient(180deg, rgba(11,16,24,0.95), rgba(11,16,24,0.85))",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, maxWidth: 920, margin: "0 auto" }}>
          <button onClick={handleClose} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#cbd5e1", cursor: "pointer", fontSize: 13, fontWeight: 700,
          }}>← Back</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Prompt Cards</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, letterSpacing: 1 }}>
              {enabledCount} of {PROMPTS.length} enabled · {dirty ? "unsaved changes" : "all saved"}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || enabledCount === 0}
            style={{
              padding: "8px 18px", borderRadius: 999,
              background: dirty && enabledCount > 0 ? "#22c55e" : "rgba(255,255,255,0.04)",
              border: "none",
              color: dirty && enabledCount > 0 ? "#000" : "#475569",
              cursor: dirty && enabledCount > 0 ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 800, letterSpacing: 1,
              transition: "all 0.15s",
            }}
          >SAVE</button>
        </div>

        {/* Bulk actions row */}
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 920, margin: "10px auto 0",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4 }}>Bulk:</span>
          <BulkBtn onClick={() => setAll(true)}>Enable all</BulkBtn>
          <BulkBtn onClick={() => setAll(false)}>Disable all</BulkBtn>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
          <BulkBtn onClick={() => setByDifficulty("easy", true)}>Enable easy</BulkBtn>
          <BulkBtn onClick={() => setByDifficulty("easy", false)}>Disable easy</BulkBtn>
          <BulkBtn onClick={() => setByDifficulty("hard", true)}>Enable hard</BulkBtn>
          <BulkBtn onClick={() => setByDifficulty("hard", false)}>Disable hard</BulkBtn>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
          <BulkBtn onClick={collapseAll}>Collapse all</BulkBtn>
          <BulkBtn onClick={expandAll}>Expand all</BulkBtn>
        </div>
      </div>

      {/* Body (scrollable) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 80px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
          {Object.entries(CATEGORIES).map(([catKey, catMeta]) => {
            const items = grouped[catKey] || [];
            if (items.length === 0) return null;
            const enabledInCat = items.filter(p => !draft.has(promptKey(p))).length;
            const catColor = `hsl(${catMeta.hue}, 70%, 65%)`;
            const catColorDim = `hsl(${catMeta.hue}, 70%, 65%, 0.1)`;
            const isCollapsed = collapsed.has(catKey);
            return (
              <section key={catKey}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, marginBottom: isCollapsed ? 0 : 10, padding: "8px 0",
                  borderBottom: `1px solid ${catColorDim}`,
                }}>
                  <button
                    onClick={() => toggleCollapse(catKey)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0,
                      background: "transparent", border: "none", padding: 0, cursor: "pointer",
                      color: "inherit", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <span style={{
                      display: "inline-block", width: 10, fontSize: 11, color: catColor,
                      transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                      transition: "transform 0.15s",
                    }}>▶</span>
                    <h2 style={{
                      margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 2,
                      textTransform: "uppercase", color: catColor,
                    }}>{catMeta.label}</h2>
                    <span style={{ fontSize: 11, color: "#475569" }}>
                      {enabledInCat}/{items.length}
                    </span>
                  </button>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <BulkBtn onClick={() => setCategory(catKey, true)} small>All on</BulkBtn>
                    <BulkBtn onClick={() => setCategory(catKey, false)} small>All off</BulkBtn>
                  </div>
                </div>
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {items.map((p, i) => (
                      <PromptCard
                        key={promptKey(p) + i}
                        prompt={p}
                        enabled={!draft.has(promptKey(p))}
                        onToggle={() => togglePrompt(p)}
                        categoryColor={catColor}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {enabledCount === 0 && (
            <div style={{
              padding: "16px 20px", borderRadius: 12,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", fontSize: 13, textAlign: "center",
            }}>
              You've disabled every prompt. Enable at least one before saving.
            </div>
          )}
        </div>
      </div>

      {/* Discard confirm */}
      {confirmClose && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,8,14,0.78)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          backdropFilter: "blur(4px)",
        }} onClick={() => setConfirmClose(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #161e2f 0%, #0f1422 100%)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
            padding: "24px 28px", maxWidth: 420, width: "100%",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>
              Discard changes?
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 22 }}>
              Your edits to enabled prompts will be lost.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmClose(false)} style={ghostBtn}>Keep editing</button>
              <button onClick={() => { setConfirmClose(false); onClose(); }} style={dangerBtn}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkBtn({ onClick, children, active, small }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "4px 10px" : "5px 12px", borderRadius: 999,
      background: active ? "rgba(129,140,248,0.18)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? "rgba(129,140,248,0.5)" : "rgba(255,255,255,0.08)"}`,
      color: active ? "#c7d2fe" : "#94a3b8",
      cursor: "pointer", fontSize: small ? 10 : 11,
      fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      transition: "all 0.15s",
    }}>{children}</button>
  );
}

const ghostBtn = {
  padding: "10px 20px", borderRadius: 999,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700,
};
const dangerBtn = {
  padding: "10px 20px", borderRadius: 999, border: "none",
  background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
};
