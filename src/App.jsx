import { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import * as math from "mathjs";

const TEAM = [
  { name: "Juan Pablo Alvis Santos", initials: "JP", hue: 210 },
  { name: "Nelson Medina Urrego", initials: "NM", hue: 265 },
  { name: "Miguel Martinez Ipuz", initials: "MM", hue: 175 },
  { name: "Beliza Andrea Montes Salazar", initials: "BM", hue: 340 },
];

const METHODS = {
  simpson13: {
    title: "Simpson 1/3", subtitle: "Newton-Cotes cerrado",
    desc: "Aproximación parabólica por pares. Requiere número par de subintervalos.",
    restriccion: "n debe ser par",
    color: "#1a56db", accent: "#e8f0fe", accentDark: "#3b82f6", icon: "∫",
    formulaShort: "I = Δ/3 · [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ··· + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
    compute: (delta, sum) => (delta / 3) * sum,
    fixN: (n) => n % 2 !== 0 ? Math.ceil(n / 2) * 2 : n,
  },
  simpson38: {
    title: "Simpson 3/8", subtitle: "Newton-Cotes cerrado",
    desc: "Aproximación cúbica con 4 puntos. Requiere múltiplos de 3 subintervalos.",
    restriccion: "n múltiplo de 3",
    color: "#7e3af2", accent: "#f3f0ff", accentDark: "#a78bfa", icon: "⅜",
    formulaShort: "I = 3Δ/8 · [f(x₁) + 3f(x₂) + 3f(x₃) + f(x₄)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 3 === 0 ? 2 : 3,
    compute: (delta, sum) => (3 * delta / 8) * sum,
    fixN: (n) => n % 3 !== 0 ? Math.ceil(n / 3) * 3 : n,
  },
  trapezoidal: {
    title: "Trapezoidal", subtitle: "Regla compuesta",
    desc: "Aproxima el área bajo la curva con trapecios. Soporta cualquier n ≥ 1.",
    restriccion: "n ≥ 1 (libre)",
    color: "#0694a2", accent: "#e0f7fa", accentDark: "#22d3ee", icon: "⌗",
    formulaShort: "I = Δ/2 · [f(x₀) + 2f(x₁) + 2f(x₂) + ··· + 2f(xₙ₋₁) + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : 2,
    compute: (delta, sum) => (delta / 2) * sum,
    fixN: (n) => n,
  },
  boole: {
    title: "Boole", subtitle: "Newton-Cotes orden 4",
    desc: "Regla cerrada de quinto orden. Fijo en 4 subintervalos (5 puntos).",
    restriccion: "n = 4 (fijo)",
    color: "#d03c8e", accent: "#fce8f3", accentDark: "#f472b6", icon: "B",
    formulaShort: "I = 2Δ/45 · [7f(x₁) + 32f(x₂) + 12f(x₃) + 32f(x₄) + 7f(x₅)]",
    coeffRule: (i) => [7, 32, 12, 32, 7][i],
    compute: (delta, sum) => (2 * delta / 45) * sum,
    fixN: () => 4,
  },
  abierto: {
    title: "Simpson Abierto", subtitle: "Regla compuesta",
    desc: "Esquema compuesto alternante (1, 4, 2, 4, ...). n par requerido.",
    restriccion: "n debe ser par",
    color: "#057a55", accent: "#e8f5e9", accentDark: "#34d399", icon: "∑",
    formulaShort: "I = Δ/3 · [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ··· + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
    compute: (delta, sum) => (delta / 3) * sum,
    fixN: (n) => n % 2 !== 0 ? Math.ceil(n / 2) * 2 : n,
  },
};

const FX_PRESETS = [
  { label: "√(x+5)", value: "sqrt(x+5)" },
  { label: "x² + 2x", value: "x^2 + 2*x" },
  { label: "sin(x)", value: "sin(x)" },
  { label: "e^(−x²)", value: "exp(-x^2)" },
  { label: "1/(1+x²)", value: "1/(1+x^2)" },
];

/* ── CountUp ── */
function CountUp({ value, decimals }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (value === null) return;
    const end = value;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / 800, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(end * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  if (value === null) return <span>—</span>;
  return <span>{display.toFixed(decimals)}</span>;
}
CountUp.propTypes = {
  value: PropTypes.number,
  decimals: PropTypes.number,
};
CountUp.defaultProps = {
  value: null,
  decimals: 8,
};

/* ── IntegralChart ── */
function IntegralChart({ funcion, limiteA, limiteB, tabla, metodo, color }) {
  const W = 560, H = 280, PAD = { t: 24, r: 20, b: 40, l: 56 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const data = useMemo(() => {
    try {
      const a = parseFloat(limiteA), b = parseFloat(limiteB);
      if (isNaN(a) || isNaN(b) || a >= b) return null;
      const expr = math.compile(funcion);
      const pts = [];
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const x = a + (b - a) * (i / N);
        try {
          const y = expr.evaluate({ x });
          if (typeof y === "number" && isFinite(y)) pts.push({ x, y });
        } catch { /* skip */ }
      }
      return pts;
    } catch { return null; }
  }, [funcion, limiteA, limiteB]);

  if (!data || data.length < 2) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: H, color: "#94a3b8", fontSize: 13 }}>
      Sin datos para graficar
    </div>
  );

  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const scaleX = (x) => PAD.l + ((x - minX) / (maxX - minX)) * innerW;
  const scaleY = (y) => PAD.t + innerH - ((y - minY) / rangeY) * innerH;

  const curvePath = data.map((p, i) =>
    `${i === 0 ? "M" : "L"}${scaleX(p.x).toFixed(2)},${scaleY(p.y).toFixed(2)}`
  ).join(" ");

  const fillPath = `${curvePath} L${scaleX(data[data.length - 1].x).toFixed(2)},${scaleY(0).toFixed(2)} L${scaleX(data[0].x).toFixed(2)},${scaleY(0).toFixed(2)} Z`;

  const sampleBars = tabla || [];
  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => minY + (rangeY * i) / yTicks);
  const xTicks = 6;
  const xTickVals = Array.from({ length: xTicks + 1 }, (_, i) => minX + ((maxX - minX) * i) / xTicks);
  const zeroY = scaleY(0);
  const accentDark = METHODS[metodo]?.accentDark || color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accentDark} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="chartClip">
          <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      {yTickVals.map((v, i) => (
        <line key={i} x1={PAD.l} y1={scaleY(v)} x2={PAD.l + innerW} y2={scaleY(v)}
          stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 4" />
      ))}
      {xTickVals.map((v, i) => (
        <line key={i} x1={scaleX(v)} y1={PAD.t} x2={scaleX(v)} y2={PAD.t + innerH}
          stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 4" />
      ))}
      {zeroY >= PAD.t && zeroY <= PAD.t + innerH && (
        <line x1={PAD.l} y1={zeroY} x2={PAD.l + innerW} y2={zeroY} stroke="#94a3b8" strokeWidth="1.2" />
      )}

      <g clipPath="url(#chartClip)">
        {sampleBars.slice(0, -1).map((row, i) => {
          const nextRow = sampleBars[i + 1];
          if (!nextRow) return null;
          const x1 = scaleX(row.xi), x2 = scaleX(nextRow.xi);
          const y1 = scaleY(row.fxi), y2 = scaleY(nextRow.fxi);
          const y0 = scaleY(0);
          return (
            <polygon key={i}
              points={`${x1},${y0} ${x1},${y1} ${x2},${y2} ${x2},${y0}`}
              fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.5" strokeWidth="0.8"
            />
          );
        })}
      </g>

      <path d={fillPath} fill="url(#fillGrad)" clipPath="url(#chartClip)" />
      <path d={curvePath} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" clipPath="url(#chartClip)" />

      {sampleBars.map((row, i) => {
        const cx = scaleX(row.xi), cy = scaleY(row.fxi);
        if (cx < PAD.l || cx > PAD.l + innerW) return null;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5" fill="#0f172a" stroke={accentDark} strokeWidth="2" />
            <circle cx={cx} cy={cy} r="2.5" fill={accentDark} />
          </g>
        );
      })}

      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#475569" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#475569" strokeWidth="1.5" />

      {yTickVals.map((v, i) => (
        <text key={i} x={PAD.l - 6} y={scaleY(v) + 4} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">
          {v.toFixed(2)}
        </text>
      ))}
      {xTickVals.map((v, i) => (
        <text key={i} x={scaleX(v)} y={PAD.t + innerH + 16} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
          {v.toFixed(2)}
        </text>
      ))}

      <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">x</text>
      <text x={12} y={PAD.t + innerH / 2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600"
        transform={`rotate(-90, 12, ${PAD.t + innerH / 2})`}>f(x)</text>

      <g transform={`translate(${PAD.l + 10}, ${PAD.t + 6})`}>
        <rect x="0" y="0" width="10" height="3" rx="1.5" fill="url(#curveGrad)" />
        <text x="14" y="5" fontSize="8.5" fill="#64748b">f(x)</text>
        <rect x="44" y="0" width="10" height="10" rx="2" fill={color} fillOpacity="0.25" stroke={color} strokeOpacity="0.5" strokeWidth="0.8" />
        <text x="58" y="8" fontSize="8.5" fill="#64748b">Área</text>
        <circle cx={104} cy={4} r="3.5" fill={accentDark} />
        <text x="112" y="7" fontSize="8.5" fill="#64748b">Nodos</text>
      </g>
    </svg>
  );
}
IntegralChart.propTypes = {
  funcion: PropTypes.string.isRequired,
  limiteA: PropTypes.string.isRequired,
  limiteB: PropTypes.string.isRequired,
  tabla: PropTypes.arrayOf(PropTypes.shape({
    xi: PropTypes.number,
    fxi: PropTypes.number,
  })),
  metodo: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
};
IntegralChart.defaultProps = {
  tabla: [],
};

/* ── NControl ── */
function NControl({ value, onChange, min, max, step, disabled, color, accent }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Subintervalos (n)
        </span>
        <span style={{ background: accent, color, fontSize: 11, fontWeight: 900, padding: "2px 10px", borderRadius: 50, fontFamily: "monospace", border: `1px solid ${color}30` }}>
          n = {value}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", background: disabled ? "#f1f3f8" : "#f8f9fb", border: `1.5px solid ${disabled ? "#e2e8f0" : color + "50"}`, borderRadius: 14, overflow: "hidden", boxShadow: disabled ? "none" : `0 2px 12px ${color}15` }}>
        <button
          onClick={() => !disabled && onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          style={{ width: 44, height: 44, border: "none", background: "transparent", cursor: disabled || value <= min ? "not-allowed" : "pointer", fontSize: 20, color: disabled || value <= min ? "#cbd5e1" : color, display: "flex", alignItems: "center", justifyContent: "center" }}
        >−</button>
        <input
          type="number" value={value}
          onChange={e => { const p = parseInt(e.target.value, 10); if (!isNaN(p)) onChange(clamp(p)); }}
          disabled={disabled} min={min} max={max} step={step}
          style={{ flex: 1, height: 44, border: "none", background: "transparent", textAlign: "center", fontSize: 17, fontWeight: 900, fontFamily: "monospace", color: disabled ? "#94a3b8" : "#1a1d2e", outline: "none", MozAppearance: "textfield" }}
        />
        <button
          onClick={() => !disabled && onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          style={{ width: 44, height: 44, border: "none", background: "transparent", cursor: disabled || value >= max ? "not-allowed" : "pointer", fontSize: 20, color: disabled || value >= max ? "#cbd5e1" : color, display: "flex", alignItems: "center", justifyContent: "center" }}
        >+</button>
      </div>
      <div style={{ marginTop: 12, position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 5, background: "#e2e8f0", borderRadius: 99 }} />
        <div style={{ position: "absolute", left: 0, height: 5, width: `${pct}%`, background: disabled ? "#cbd5e1" : `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 99 }} />
        <input
          type="range" min={min} max={max} step={step} value={value} disabled={disabled}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", margin: 0, opacity: 0, height: 20, cursor: disabled ? "not-allowed" : "pointer", zIndex: 2 }}
        />
        <div style={{ position: "absolute", left: `calc(${pct}% - 10px)`, width: 20, height: 20, borderRadius: "50%", background: disabled ? "#cbd5e1" : "#fff", border: `2.5px solid ${disabled ? "#cbd5e1" : color}`, boxShadow: disabled ? "none" : `0 2px 8px ${color}40`, zIndex: 1, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{min}</span>
        <span style={{ fontSize: 9, color: "#94a3b8", fontStyle: "italic" }}>{disabled ? "Valor fijo" : "Arrastra o usa ±"}</span>
        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{max}</span>
      </div>
    </div>
  );
}
NControl.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  color: PropTypes.string.isRequired,
  accent: PropTypes.string.isRequired,
};
NControl.defaultProps = {
  disabled: false,
};

/* ── LimitInput ── */
function LimitInput({ label, value, onChange }) {
  const numVal = parseFloat(value);
  return (
    <div style={{ minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, letterSpacing: "0.02em" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8f9fb", overflow: "hidden", width: "100%" }}>
        <button
          onClick={() => onChange(String((isNaN(numVal) ? 0 : numVal) - 1))}
          style={{ width: 36, minWidth: 36, height: 40, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "#94a3b8", flexShrink: 0 }}
        >−</button>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, width: 0, border: "none", background: "transparent", textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#1a1d2e", outline: "none", padding: "10px 2px" }}
        />
        <button
          onClick={() => onChange(String((isNaN(numVal) ? 0 : numVal) + 1))}
          style={{ width: 36, minWidth: 36, height: 40, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "#94a3b8", flexShrink: 0 }}
        >+</button>
      </div>
    </div>
  );
}
LimitInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/* ── TeamModal ── */
function TeamModal({ onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,30,0.6)", backdropFilter: "blur(6px)" }} />
      <div
        style={{ position: "relative", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "32px 36px", width: 420, maxWidth: "90vw", boxShadow: "0 40px 100px rgba(0,0,0,0.5)", animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 9, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>
              Métodos Numéricos · Comfenalco
            </p>
            <h3 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, margin: 0 }}>Equipo de Desarrollo</h3>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TEAM.map((member, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px", animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `hsl(${member.hue}, 55%, 18%)`, border: `2px solid hsl(${member.hue}, 65%, 45%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: `hsl(${member.hue}, 80%, 75%)`, letterSpacing: "-0.02em" }}>
                {member.initials}
              </div>
              <div>
                <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{member.name}</p>
                <p style={{ color: "#475569", fontSize: 10, margin: "2px 0 0", fontWeight: 500 }}>Ingeniería · Cálculo Numérico</p>
              </div>
              <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: `hsl(${member.hue}, 70%, 55%)`, boxShadow: `0 0 8px hsl(${member.hue}, 70%, 55%)` }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>Fundación Universitaria Tecnológico Comfenalco · 2025</p>
        </div>
      </div>
    </div>
  );
}
TeamModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

/* ══════════════════════════════
   APP PRINCIPAL
══════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState("sim");
  const [metodo, setMetodo] = useState("simpson13");
  const [funcion, setFuncion] = useState("sqrt(x + 5)");
  const [limiteA, setLimiteA] = useState("0");
  const [limiteB, setLimiteB] = useState("19");
  const [nVal, setNVal] = useState(6);
  const [showTeam, setShowTeam] = useState(false);
  const [result, setResult] = useState(null);
  const [tabla, setTabla] = useState([]);
  const [delta, setDelta] = useState(null);
  const [sumatoria, setSumatoria] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const m = METHODS[metodo];

  const getStep = () => {
    if (metodo === "simpson38") return 3;
    if (metodo === "simpson13" || metodo === "abierto") return 2;
    return 1;
  };

  const calcular = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      try {
        const a = parseFloat(limiteA), b = parseFloat(limiteB);
        if (isNaN(a) || isNaN(b)) throw new Error("Los límites deben ser valores numéricos válidos.");
        if (a >= b) throw new Error("El límite superior (b) debe ser mayor que el inferior (a).");
        let n = m.fixN(nVal); setNVal(n);
        const dlt = (b - a) / n;
        const expr = math.compile(funcion);
        const f = (x) => {
          const r = expr.evaluate({ x });
          if (typeof r === "object" && r.isComplex) throw new Error("Valor complejo.");
          return r;
        };
        let sum = 0, rows = [];
        for (let i = 0; i <= n; i++) {
          const xi = a + i * dlt, fxi = f(xi), coef = m.coeffRule(i, n), parcial = coef * fxi;
          sum += parcial;
          rows.push({ i, xi, fxi, coef, parcial });
        }
        const integral = m.compute(dlt, sum);
        setDelta(dlt); setTabla(rows); setSumatoria(sum); setResult(integral);
      } catch (e) {
        setError(e.message || "Error en la expresión.");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const reset = () => {
    setResult(null); setTabla([]); setDelta(null); setSumatoria(null); setError("");
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f4f6fb", minHeight: "100vh", color: "#1a1d2e" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a3a 100%)", padding: "2rem 2.5rem 1.8rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 80% 20%, rgba(59,130,246,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(139,92,246,0.12) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 50, padding: "4px 14px", marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
              <span style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Fundación Universitaria Tecnológico Comfenalco
              </span>
            </div>
            <h1 style={{ color: "#f8fafc", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Sistema de Integración Numérica
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
              Trabajo Final · Métodos Numéricos · Newton-Cotes
            </p>
          </div>
          <button
            onClick={() => setShowTeam(true)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", borderRadius: 12, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 8 }}
          >
            <span>👥</span> Ver Autores
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 0" }}>
        <div style={{ display: "flex", gap: 4, background: "#e2e8f0", borderRadius: 14, padding: 5, width: "fit-content" }}>
          {[{ id: "sim", label: "Simulador", icon: "⊕" }, { id: "teoria", label: "Marco Teórico", icon: "∂" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 22px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", transition: "all 0.25s", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#1a1d2e" : "#64748b", boxShadow: tab === t.id ? "0 2px 12px rgba(0,0,0,0.1)" : "none" }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SIMULADOR ── */}
      {tab === "sim" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 3rem", display: "grid", gridTemplateColumns: "400px 1fr", gap: 24, alignItems: "start" }}>

          {/* PANEL IZQUIERDO */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Selector de método */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e8eaf0" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}>
                Algoritmo Analítico
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(METHODS).map(([key, md]) => {
                  const sel = metodo === key;
                  return (
                    <button key={key} onClick={() => { setMetodo(key); reset(); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 14, border: sel ? `2px solid ${md.color}` : "1.5px solid #e8eaf0", background: sel ? md.accent : "#fafafa", cursor: "pointer", transition: "all 0.22s", transform: sel ? "scale(1.015)" : "scale(1)", boxShadow: sel ? `0 4px 20px ${md.color}25` : "none", textAlign: "left" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: sel ? md.color : "#e8eaf0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: sel ? "#fff" : "#94a3b8" }}>{md.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: sel ? md.color : "#1a1d2e" }}>{md.title}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{md.subtitle} · {md.restriccion}</div>
                      </div>
                      {sel && <div style={{ width: 7, height: 7, borderRadius: "50%", background: md.color, boxShadow: `0 0 8px ${md.color}` }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parámetros */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e8eaf0" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 16px" }}>
                Parámetros de Entrada
              </p>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Preajustes f(x)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {FX_PRESETS.map(p => (
                    <button key={p.value} onClick={() => { setFuncion(p.value); reset(); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid", borderColor: funcion === p.value ? m.color : "#e2e8f0", background: funcion === p.value ? m.accent : "#f8f9fb", color: funcion === p.value ? m.color : "#475569", fontSize: 11, fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                Función objetivo f(x)
              </label>
              <input
                value={funcion}
                onChange={e => setFuncion(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8f9fb", fontSize: 13, fontFamily: "monospace", color: "#1a1d2e", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
                placeholder="ej. sqrt(x+5)"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <LimitInput label="Límite inferior (a)" value={limiteA} onChange={v => { setLimiteA(v); reset(); }} />
                <LimitInput label="Límite superior (b)" value={limiteB} onChange={v => { setLimiteB(v); reset(); }} />
              </div>
              <NControl
                value={nVal} onChange={setNVal}
                min={metodo === "boole" ? 4 : 2} max={30} step={getStep()}
                disabled={metodo === "boole"} color={m.color} accent={m.accent}
              />
              {error && (
                <div style={{ marginTop: 14, background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: 12, padding: "10px 14px", color: "#be123c", fontSize: 12, fontWeight: 600 }}>
                  ⚠️ {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={reset} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8f9fb", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  ↺ Resetear
                </button>
                <button onClick={calcular} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: loading ? "#94a3b8" : m.color, color: "#fff", fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${m.color}40` }}>
                  {loading ? "⟳ Calculando..." : "Calcular Integral"}
                </button>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Fórmula activa */}
            <div style={{ background: "#0f172a", borderRadius: 20, padding: 24, border: `1px solid ${m.color}40`, boxShadow: `0 0 40px ${m.color}15` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Fórmula Activa</span>
                  <h3 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 800, margin: "4px 0 0" }}>{m.title} — {m.subtitle}</h3>
                </div>
                <div style={{ background: `${m.color}25`, border: `1px solid ${m.color}50`, borderRadius: 10, padding: "6px 14px", color: m.accentDark, fontSize: 11, fontWeight: 800, fontFamily: "monospace" }}>
                  {metodo}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: m.accentDark, letterSpacing: "0.04em", lineHeight: 1.8 }}>
                  {m.formulaShort}
                </div>
              </div>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, margin: "12px 0 0" }}>{m.desc}</p>
            </div>

            {/* GRÁFICA */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #e8eaf0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Visualización Geométrica</p>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: "4px 0 0", color: "#1a1d2e" }}>
                    {funcion || "f(x)"} &nbsp;en&nbsp; [{limiteA}, {limiteB}]
                  </h4>
                </div>
                {result !== null && (
                  <div style={{ background: m.accent, border: `1px solid ${m.color}30`, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: m.color, fontFamily: "monospace" }}>
                      ∫ ≈ {result?.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ background: "#f8f9fb", borderRadius: 14, padding: "12px 8px", border: "1px solid #e8eaf0" }}>
                <IntegralChart
                  funcion={funcion} limiteA={limiteA} limiteB={limiteB}
                  tabla={result !== null ? tabla : []} metodo={metodo} color={m.color}
                />
              </div>
              {result === null && (
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 10, fontStyle: "italic" }}>
                  La gráfica muestra la función. Calcula la integral para ver los nodos de integración.
                </p>
              )}
            </div>

            {/* Resultados */}
            {result !== null && !loading && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #e8eaf0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease" }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 16px" }}>
                  Resultados de la Integración
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  {[
                    { label: "Diferencial (Δ)", value: delta?.toFixed(6), accent: "#f1f5f9", text: "#475569", big: false },
                    { label: "Resultado Integral", value: <CountUp value={result} decimals={8} />, accent: m.accent, text: m.color, big: true },
                    { label: "Σ acumulada", value: sumatoria?.toFixed(8), accent: "#f8f9fb", text: "#1a1d2e", big: false },
                    { label: "Subintervalos usados", value: tabla.length - 1, accent: "#f8f9fb", text: "#1a1d2e", big: false },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background: kpi.accent, borderRadius: 14, padding: kpi.big ? "16px 18px" : "14px 16px", border: "1.5px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{kpi.label}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, color: kpi.text, fontSize: kpi.big ? 19 : 15, display: "block" }}>{kpi.value}</span>
                    </div>
                  ))}
                </div>

                {/* Tabla */}
                <div style={{ border: "1.5px solid #e8eaf0", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ background: "#f8f9fb", padding: "10px 16px", borderBottom: "1px solid #e8eaf0", display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr", gap: 8 }}>
                    {["Xᵢ", "Coef · f(xᵢ)", "f(xᵢ)", "Parcial"].map(h => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {tabla.map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr", gap: 8, padding: "9px 16px", background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: idx < tabla.length - 1 ? "1px solid #f1f3f8" : "none" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1a1d2e" }}>{row.xi.toFixed(4)}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: m.color, fontWeight: 600 }}>{row.coef} × f({row.xi.toFixed(3)})</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>{row.fxi.toFixed(5)}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 800, color: "#059669" }}>{row.parcial.toFixed(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14, background: `linear-gradient(135deg, ${m.accent}, #f8f9fb)`, border: `1.5px solid ${m.color}30`, borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Sumatoria total Σ f(xᵢ) · coef
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 14, color: m.color }}>
                    {sumatoria?.toFixed(10)}
                  </span>
                </div>
              </div>
            )}

            {loading && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, border: "1px solid #e8eaf0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${m.color}20`, borderTopColor: m.color, animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: 0 }}>Procesando integral...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MARCO TEÓRICO ── */}
      {tab === "teoria" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 2rem 4rem" }}>
          <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: 20, padding: "28px 32px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Newton-Cotes — Marco Conceptual</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.75, margin: 0, maxWidth: 700 }}>
              Las fórmulas de Newton-Cotes aproximan integrales definidas reemplazando f(x) por un polinomio interpolador que pasa por puntos equiespaciados con incremento constante{" "}
              <span style={{ fontFamily: "monospace", color: "#60a5fa" }}>Δ = (b − a) / n</span>.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {Object.entries(METHODS).map(([key, md]) => (
              <div key={key} style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1.5px solid #e8eaf0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", gridColumn: key === "abierto" ? "1 / -1" : "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: md.accent, border: `2px solid ${md.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: md.color }}>{md.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#1a1d2e" }}>{md.title}</h3>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{md.subtitle}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, margin: "0 0 14px" }}>{md.desc}</p>
                <div style={{ background: "#0f172a", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 12, color: md.accentDark, lineHeight: 1.8 }}>{md.formulaShort}</div>
                </div>
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: md.accent, border: `1px solid ${md.color}30`, borderRadius: 50, padding: "3px 12px" }}>
                  <span style={{ fontSize: 10, color: md.color, fontWeight: 700 }}>⚡ {md.restriccion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEAM MODAL ── */}
      {showTeam && <TeamModal onClose={() => setShowTeam(false)} />}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f3f8; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}