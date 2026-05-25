'ENDOFFILE'
// ── ARCHIVO COMPLETO — PEGAR EN TU PROYECTO ──
// Fixes: título corregido con key={metodo} para forzar re-mount
// Mejora: fondo premium con canvas multi-layer (aurora + orbes + constelación)

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import * as math from "mathjs";

const TEAM = [
  { name: "Juan Pablo Alvis Santos",      initials: "JP", hue: 210 },
  { name: "Nelson Medina Urrego",         initials: "NM", hue: 265 },
  { name: "Miguel Martinez Ipuz",         initials: "MM", hue: 175 },
  { name: "Beliza Andrea Montes Salazar", initials: "BM", hue: 340 },
];

const METHODS = {
  simpson13: {
    title: "Simpson 1/3", subtitle: "Newton-Cotes cerrado",
    desc: "Aproximación parabólica por pares. Requiere número par de subintervalos.",
    restriccion: "n debe ser par",
    color: "#2563eb", accent: "#1e3a8a", accentDark: "#60a5fa", icon: "∫",
    formulaShort: "I = Δ/3 · [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ··· + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
    compute: (delta, sum) => (delta / 3) * sum,
    fixN: (n) => n % 2 !== 0 ? Math.ceil(n / 2) * 2 : n,
  },
  simpson38: {
    title: "Simpson 3/8", subtitle: "Newton-Cotes cerrado",
    desc: "Aproximación cúbica con 4 puntos. Requiere múltiplos de 3 subintervalos.",
    restriccion: "n múltiplo de 3",
    color: "#7c3aed", accent: "#3b0764", accentDark: "#c4b5fd", icon: "⅜",
    formulaShort: "I = 3Δ/8 · [f(x₁) + 3f(x₂) + 3f(x₃) + f(x₄)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 3 === 0 ? 2 : 3,
    compute: (delta, sum) => (3 * delta / 8) * sum,
    fixN: (n) => n % 3 !== 0 ? Math.ceil(n / 3) * 3 : n,
  },
  trapezoidal: {
    title: "Trapezoidal", subtitle: "Regla compuesta",
    desc: "Aproxima el área bajo la curva con trapecios. Soporta cualquier n ≥ 1.",
    restriccion: "n ≥ 1 (libre)",
    color: "#0891b2", accent: "#164e63", accentDark: "#67e8f9", icon: "⌗",
    formulaShort: "I = Δ/2 · [f(x₀) + 2f(x₁) + 2f(x₂) + ··· + 2f(xₙ₋₁) + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : 2,
    compute: (delta, sum) => (delta / 2) * sum,
    fixN: (n) => n,
  },
  boole: {
    title: "Boole", subtitle: "Newton-Cotes orden 4",
    desc: "Regla cerrada de quinto orden. Fijo en 4 subintervalos (5 puntos).",
    restriccion: "n = 4 (fijo)",
    color: "#be185d", accent: "#500724", accentDark: "#f9a8d4", icon: "B",
    formulaShort: "I = 2Δ/45 · [7f(x₁) + 32f(x₂) + 12f(x₃) + 32f(x₄) + 7f(x₅)]",
    coeffRule: (i) => [7, 32, 12, 32, 7][i],
    compute: (delta, sum) => (2 * delta / 45) * sum,
    fixN: () => 4,
  },
  abierto: {
    title: "Simpson Abierto", subtitle: "Regla compuesta",
    desc: "Esquema compuesto alternante (1, 4, 2, 4, ...). n par requerido.",
    restriccion: "n debe ser par",
    color: "#059669", accent: "#022c22", accentDark: "#6ee7b7", icon: "∑",
    formulaShort: "I = Δ/3 · [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ··· + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
    compute: (delta, sum) => (delta / 3) * sum,
    fixN: (n) => n % 2 !== 0 ? Math.ceil(n / 2) * 2 : n,
  },
};

const FX_PRESETS = [
  { label: "√(x+5)",   value: "sqrt(x+5)" },
  { label: "x²+2x",    value: "x^2 + 2*x" },
  { label: "sin(x)",   value: "sin(x)" },
  { label: "e^(−x²)",  value: "exp(-x^2)" },
  { label: "1/(1+x²)", value: "1/(1+x^2)" },
];

/* ══════════════════════════════════════════════════════
   FONDO PREMIUM MULTI-LAYER
══════════════════════════════════════════════════════ */
function PremiumBackground({ activeColor }) {
  const canvasRef = useRef(null);
  const colorRef  = useRef(activeColor);
  useEffect(() => { colorRef.current = activeColor; }, [activeColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const hexNodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.14,
      r:  Math.random() * 2.2 + 0.6,
      ph: Math.random() * Math.PI * 2,
      ps: Math.random() * 0.012 + 0.005,
      tier: Math.floor(Math.random() * 3),
    }));

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r:  Math.random() * 0.9 + 0.1,
      op: Math.random() * 0.4 + 0.05,
      ph: Math.random() * Math.PI * 2,
      ps: Math.random() * 0.006 + 0.002,
    }));

    const bands = [
      { oy: 0.28, amp: 0.09, freq: 0.0007, spd: 0.00035, phase: 0,   w: 0.38, cIdx: 0 },
      { oy: 0.62, amp: 0.07, freq: 0.0009, spd: 0.00028, phase: 2.1, w: 0.30, cIdx: 1 },
      { oy: 0.45, amp: 0.05, freq: 0.0011, spd: 0.00042, phase: 4.3, w: 0.22, cIdx: 2 },
    ];

    const orbs = [
      { cx: 0.72, cy: 0.22, orbitR: 0.14, spd: 0.00022, phase: 0,    r: 180, op: 0.10, cIdx: 0 },
      { cx: 0.18, cy: 0.68, orbitR: 0.10, spd: 0.00017, phase: 2.09, r: 140, op: 0.08, cIdx: 1 },
      { cx: 0.50, cy: 0.08, orbitR: 0.08, spd: 0.00030, phase: 4.18, r: 110, op: 0.07, cIdx: 2 },
      { cx: 0.88, cy: 0.82, orbitR: 0.06, spd: 0.00018, phase: 1.05, r:  90, op: 0.06, cIdx: 0 },
    ];

    let raf;
    const loop = (ts = 0) => {
      const W = canvas.width, H = canvas.height;
      const col = colorRef.current;
      const cr = parseInt(col.slice(1,3),16);
      const cg = parseInt(col.slice(3,5),16);
      const cb = parseInt(col.slice(5,7),16);
      const palette = [`${cr},${cg},${cb}`, "124,58,237", "8,145,178"];

      ctx.clearRect(0, 0, W, H);

      /* deep space */
      const base = ctx.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, Math.max(W,H)*0.75);
      base.addColorStop(0, "rgba(4,8,20,1)");
      base.addColorStop(0.6, "rgba(2,5,14,1)");
      base.addColorStop(1, "rgba(1,3,8,1)");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);

      /* orb glows */
      orbs.forEach(o => {
        const angle = ts * o.spd + o.phase;
        const ox = W * (o.cx + Math.cos(angle) * o.orbitR);
        const oy = H * (o.cy + Math.sin(angle) * o.orbitR * 0.55);
        const rgb = palette[o.cIdx % palette.length];
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, W * (o.r/1000));
        g.addColorStop(0,   `rgba(${rgb},${o.op})`);
        g.addColorStop(0.5, `rgba(${rgb},${o.op * 0.4})`);
        g.addColorStop(1,   `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      /* aurora bands */
      bands.forEach(b => {
        b.phase += b.spd;
        const rgb = palette[b.cIdx % palette.length];
        ctx.save();
        ctx.globalAlpha = 0.055;
        const path = new Path2D();
        for (let x = 0; x <= W; x += 3) {
          const y = H * b.oy + Math.sin(x * b.freq + b.phase) * H * b.amp
                  + Math.sin(x * b.freq * 1.7 + b.phase * 1.3) * H * b.amp * 0.4;
          if (x === 0) path.moveTo(x, y); else path.lineTo(x, y);
        }
        path.lineTo(W, H); path.lineTo(0, H); path.closePath();
        const auroraGrad = ctx.createLinearGradient(0, H * b.oy - H*b.w*0.5, 0, H * b.oy + H*b.w*0.5);
        auroraGrad.addColorStop(0, `rgba(${rgb},0)`);
        auroraGrad.addColorStop(0.4, `rgba(${rgb},0.22)`);
        auroraGrad.addColorStop(0.6, `rgba(${rgb},0.22)`);
        auroraGrad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = auroraGrad;
        ctx.fill(path);
        ctx.restore();
      });

      /* stars */
      stars.forEach(s => {
        s.ph += s.ps;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(0.6, s.op + Math.sin(s.ph) * 0.1));
        ctx.fillStyle = "#dde8ff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      /* constellation lines */
      for (let i = 0; i < hexNodes.length; i++) {
        for (let j = i+1; j < hexNodes.length; j++) {
          const a = hexNodes[i], b = hexNodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 100) {
            ctx.save();
            ctx.globalAlpha = (1 - d/100) * 0.18;
            ctx.strokeStyle = `rgba(${palette[a.tier % 3]},1)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      /* nodes */
      hexNodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.ph += n.ps;
        if (n.x < -20) n.x = W+20; if (n.x > W+20) n.x = -20;
        if (n.y < -20) n.y = H+20; if (n.y > H+20) n.y = -20;
        const rr = n.r + Math.sin(n.ph) * 0.6;
        const ao = 0.15 + Math.sin(n.ph * 1.1) * 0.12;
        const rgb = palette[n.tier % 3];
        ctx.save();
        ctx.globalAlpha = ao * 0.45;
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr * 4);
        halo.addColorStop(0, `rgba(${rgb},0.5)`);
        halo.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr * 4, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = Math.min(0.9, ao + 0.25);
        ctx.fillStyle = `rgba(${rgb},1)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });

      /* scanlines */
      ctx.save();
      ctx.globalAlpha = 0.018;
      for (let y = 0; y < H; y += 3) { ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0, y, W, 1); }
      ctx.restore();

      /* vignette */
      const vig = ctx.createRadialGradient(W*0.5, H*0.5, H*0.3, W*0.5, H*0.5, H*0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100vw", height:"100vh", pointerEvents:"none", zIndex:0 }}/>;
}
PremiumBackground.propTypes = { activeColor: PropTypes.string };
PremiumBackground.defaultProps = { activeColor: "#2563eb" };

function GridOverlay() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:1,
      backgroundImage: ["linear-gradient(rgba(56,139,253,0.022) 1px, transparent 1px)","linear-gradient(90deg, rgba(56,139,253,0.022) 1px, transparent 1px)"].join(","),
      backgroundSize:"56px 56px" }}/>
  );
}

function CountUp({ value, decimals }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (value === null) return;
    const end = value;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / 900, 1);
      setDisplay(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  if (value === null) return <span>—</span>;
  return <span>{display.toFixed(decimals)}</span>;
}
CountUp.propTypes = { value: PropTypes.number, decimals: PropTypes.number };
CountUp.defaultProps = { value: null, decimals: 8 };

function IntegralChart({ funcion, limiteA, limiteB, tabla, metodo, color }) {
  const W = 560, H = 280, PAD = { t: 24, r: 20, b: 40, l: 56 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const data = useMemo(() => {
    try {
      const a = parseFloat(limiteA), b = parseFloat(limiteB);
      if (isNaN(a) || isNaN(b) || a >= b) return null;
      const expr = math.compile(funcion);
      const pts = [];
      for (let i = 0; i <= 200; i++) {
        const x = a + (b - a) * (i / 200);
        try { const y = expr.evaluate({ x }); if (typeof y === "number" && isFinite(y)) pts.push({ x, y }); } catch { /**/ }
      }
      return pts;
    } catch { return null; }
  }, [funcion, limiteA, limiteB]);

  if (!data || data.length < 2) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:H, color:"#334155", fontSize:13 }}>Sin datos para graficar</div>;

  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const scaleX = x => PAD.l + ((x - minX) / (maxX - minX)) * innerW;
  const scaleY = y => PAD.t + innerH - ((y - minY) / rangeY) * innerH;
  const curvePath = data.map((p, i) => `${i===0?"M":"L"}${scaleX(p.x).toFixed(2)},${scaleY(p.y).toFixed(2)}`).join(" ");
  const fillPath = `${curvePath} L${scaleX(data[data.length-1].x).toFixed(2)},${scaleY(0).toFixed(2)} L${scaleX(data[0].x).toFixed(2)},${scaleY(0).toFixed(2)} Z`;
  const zeroY = scaleY(0);
  const accentDark = METHODS[metodo]?.accentDark || color;
  const yTicks = Array.from({ length: 6 }, (_, i) => minY + (rangeY * i) / 5);
  const xTicks = Array.from({ length: 7 }, (_, i) => minX + ((maxX - minX) * i) / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38"/><stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accentDark}/><stop offset="100%" stopColor={color}/>
        </linearGradient>
        <filter id="lineGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="clip"><rect x={PAD.l} y={PAD.t} width={innerW} height={innerH}/></clipPath>
      </defs>
      {yTicks.map((v, i) => <line key={i} x1={PAD.l} y1={scaleY(v)} x2={PAD.l+innerW} y2={scaleY(v)} stroke="rgba(148,163,184,0.12)" strokeWidth="0.8" strokeDasharray="4 5"/>)}
      {xTicks.map((v, i) => <line key={i} x1={scaleX(v)} y1={PAD.t} x2={scaleX(v)} y2={PAD.t+innerH} stroke="rgba(148,163,184,0.12)" strokeWidth="0.8" strokeDasharray="4 5"/>)}
      {zeroY >= PAD.t && zeroY <= PAD.t+innerH && <line x1={PAD.l} y1={zeroY} x2={PAD.l+innerW} y2={zeroY} stroke="rgba(148,163,184,0.35)" strokeWidth="1"/>}
      <g clipPath="url(#clip)">
        {(tabla||[]).slice(0,-1).map((row, i) => { const nr=(tabla||[])[i+1]; if(!nr) return null; const y0=scaleY(0); return <polygon key={i} points={`${scaleX(row.xi)},${y0} ${scaleX(row.xi)},${scaleY(row.fxi)} ${scaleX(nr.xi)},${scaleY(nr.fxi)} ${scaleX(nr.xi)},${y0}`} fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.45" strokeWidth="0.7"/>; })}
        <path d={fillPath} fill="url(#fillGrad)"/>
        <path d={curvePath} fill="none" stroke="url(#curveGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)"/>
      </g>
      {(tabla||[]).map((row, i) => { const cx=scaleX(row.xi), cy=scaleY(row.fxi); if(cx<PAD.l||cx>PAD.l+innerW) return null; return <g key={i}><circle cx={cx} cy={cy} r="7" fill="none" stroke={accentDark} strokeWidth="1" strokeOpacity="0.4"/><circle cx={cx} cy={cy} r="4.5" fill="#070d1a" stroke={accentDark} strokeWidth="1.8"/><circle cx={cx} cy={cy} r="2" fill={accentDark}/></g>; })}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+innerH} stroke="rgba(71,85,105,0.6)" strokeWidth="1.2"/>
      <line x1={PAD.l} y1={PAD.t+innerH} x2={PAD.l+innerW} y2={PAD.t+innerH} stroke="rgba(71,85,105,0.6)" strokeWidth="1.2"/>
      {yTicks.map((v, i) => <text key={i} x={PAD.l-6} y={scaleY(v)+4} textAnchor="end" fontSize="8.5" fill="rgba(100,116,139,0.8)" fontFamily="monospace">{v.toFixed(1)}</text>)}
      {xTicks.map((v, i) => <text key={i} x={scaleX(v)} y={PAD.t+innerH+15} textAnchor="middle" fontSize="8.5" fill="rgba(100,116,139,0.8)" fontFamily="monospace">{v.toFixed(1)}</text>)}
    </svg>
  );
}
IntegralChart.propTypes = { funcion: PropTypes.string.isRequired, limiteA: PropTypes.string.isRequired, limiteB: PropTypes.string.isRequired, metodo: PropTypes.string.isRequired, color: PropTypes.string.isRequired, tabla: PropTypes.arrayOf(PropTypes.shape({ xi: PropTypes.number, fxi: PropTypes.number })) };
IntegralChart.defaultProps = { tabla: [] };

function LimitInputDark({ label, value, onChange }) {
  const nv = parseFloat(value);
  return (
    <div style={{ minWidth: 0 }}>
      <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#475569", marginBottom:7, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", border:"1px solid rgba(255,255,255,0.09)", borderRadius:11, background:"rgba(255,255,255,0.04)", overflow:"hidden" }}>
        <button onClick={() => onChange(String((isNaN(nv)?0:nv)-1))} style={{ width:36, minWidth:36, height:42, border:"none", background:"transparent", cursor:"pointer", fontSize:18, color:"#475569", flexShrink:0 }}>−</button>
        <input value={value} onChange={e => onChange(e.target.value)} style={{ flex:1, minWidth:0, width:0, border:"none", background:"transparent", textAlign:"center", fontSize:14, fontWeight:700, fontFamily:"'Fira Code', monospace", color:"#e2e8f0", outline:"none", padding:"10px 2px" }}/>
        <button onClick={() => onChange(String((isNaN(nv)?0:nv)+1))} style={{ width:36, minWidth:36, height:42, border:"none", background:"transparent", cursor:"pointer", fontSize:18, color:"#475569", flexShrink:0 }}>+</button>
      </div>
    </div>
  );
}
LimitInputDark.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

function NControlDark({ value, onChange, min, max, step, disabled, color, accentDark }) {
  const clamp = v => Math.max(min, Math.min(max, v));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ userSelect:"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:10, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" }}>Subintervalos (n)</span>
        <span style={{ background:`${color}22`, color:accentDark, fontSize:12, fontWeight:900, padding:"3px 12px", borderRadius:50, fontFamily:"'Fira Code', monospace", border:`1px solid ${color}35` }}>n = {value}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.04)", border:`1px solid ${disabled?"rgba(255,255,255,0.07)":color+"38"}`, borderRadius:14, overflow:"hidden" }}>
        <button onClick={() => !disabled && onChange(clamp(value-step))} disabled={disabled||value<=min} style={{ width:46, height:46, border:"none", background:"transparent", cursor:disabled||value<=min?"not-allowed":"pointer", fontSize:22, color:disabled||value<=min?"#1e293b":accentDark, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
        <input type="number" value={value} onChange={e => { const p=parseInt(e.target.value,10); if(!isNaN(p)) onChange(clamp(p)); }} disabled={disabled} min={min} max={max} step={step} style={{ flex:1, height:46, border:"none", background:"transparent", textAlign:"center", fontSize:18, fontWeight:900, fontFamily:"'Fira Code', monospace", color:disabled?"#1e293b":"#f1f5f9", outline:"none", MozAppearance:"textfield" }}/>
        <button onClick={() => !disabled && onChange(clamp(value+step))} disabled={disabled||value>=max} style={{ width:46, height:46, border:"none", background:"transparent", cursor:disabled||value>=max?"not-allowed":"pointer", fontSize:22, color:disabled||value>=max?"#1e293b":accentDark, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      </div>
      <div style={{ marginTop:14, position:"relative", height:22, display:"flex", alignItems:"center" }}>
        <div style={{ position:"absolute", left:0, right:0, height:4, background:"rgba(255,255,255,0.07)", borderRadius:99 }}/>
        <div style={{ position:"absolute", left:0, height:4, width:`${pct}%`, background:disabled?"#1e293b":`linear-gradient(90deg, ${color}60, ${color})`, borderRadius:99, transition:"width 0.3s" }}/>
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(parseInt(e.target.value,10))} style={{ position:"absolute", left:0, right:0, width:"100%", margin:0, opacity:0, height:22, cursor:disabled?"not-allowed":"pointer", zIndex:2 }}/>
        <div style={{ position:"absolute", left:`calc(${pct}% - 11px)`, width:22, height:22, borderRadius:"50%", background:"#060b16", border:`2px solid ${disabled?"#1e293b":color}`, zIndex:1, pointerEvents:"none", transition:"left 0.3s" }}/>
      </div>
    </div>
  );
}
NControlDark.propTypes = { value: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired, min: PropTypes.number.isRequired, max: PropTypes.number.isRequired, step: PropTypes.number.isRequired, disabled: PropTypes.bool, color: PropTypes.string.isRequired, accentDark: PropTypes.string.isRequired };
NControlDark.defaultProps = { disabled: false };

function GlassCard({ children, style = {}, glow = null, delay = 0 }) {
  return (
    <div style={{ background:"rgba(5,10,24,0.78)", backdropFilter:"blur(22px) saturate(180%)", WebkitBackdropFilter:"blur(22px) saturate(180%)", borderRadius:20, border:"1px solid rgba(255,255,255,0.07)", boxShadow:["0 8px 40px rgba(0,0,0,0.55)", glow?`0 0 55px ${glow}15`:"", "inset 0 1px 0 rgba(255,255,255,0.05)"].filter(Boolean).join(", "), animation:`slideUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}s both`, ...style }}>
      {children}
    </div>
  );
}
GlassCard.propTypes = { children: PropTypes.node, style: PropTypes.object, glow: PropTypes.string, delay: PropTypes.number };

function TeamModal({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(2,6,15,0.88)", backdropFilter:"blur(18px)" }}/>
      <div style={{ position:"relative", background:"linear-gradient(145deg, rgba(7,12,28,0.99) 0%, rgba(10,16,38,0.99) 100%)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:28, padding:"36px 40px", width:440, maxWidth:"92vw", boxShadow:"0 50px 120px rgba(0,0,0,0.7)", animation:"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:2, background:"linear-gradient(90deg, transparent, rgba(37,99,235,0.8), rgba(124,58,237,0.6), transparent)", borderRadius:"0 0 4px 4px" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#22d3ee", animation:"dotPulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize:9, color:"#475569", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.14em" }}>Métodos Numéricos · Comfenalco</span>
            </div>
            <h3 style={{ color:"#f1f5f9", fontSize:20, fontWeight:800, margin:0 }}>Equipo de Desarrollo</h3>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#64748b", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {TEAM.map((member, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:16, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:16, padding:"14px 18px", animation:`slideUp 0.4s ease ${i*0.08}s both` }}>
              <div style={{ width:44, height:44, borderRadius:"50%", flexShrink:0, background:`hsl(${member.hue},60%,10%)`, border:`2px solid hsl(${member.hue},65%,38%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:`hsl(${member.hue},80%,72%)` }}>{member.initials}</div>
              <div style={{ flex:1 }}>
                <p style={{ color:"#e2e8f0", fontSize:13, fontWeight:700, margin:0 }}>{member.name}</p>
                <p style={{ color:"#334155", fontSize:10, margin:"3px 0 0" }}>Ingeniería · Metodos Numéricos</p>
              </div>
              <div style={{ width:7, height:7, borderRadius:"50%", background:`hsl(${member.hue},70%,55%)`, animation:`dotPulse 2s ease-in-out ${i*0.3}s infinite`, flexShrink:0 }}/>
            </div>
          ))}
        </div>
        <div style={{ marginTop:22, padding:"14px 18px", background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.18)", borderRadius:14, textAlign:"center" }}>
          <p style={{ color:"#334155", fontSize:11, margin:0 }}>Fundación Universitaria Tecnológico Comfenalco · 2026</p>
        </div>
      </div>
    </div>
  );
}
TeamModal.propTypes = { onClose: PropTypes.func.isRequired };

function Ticker({ items }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i+1) % items.length); setVisible(true); }, 400);
    }, 3200);
    return () => clearInterval(id);
  }, [items.length]);
  return <span style={{ fontFamily:"monospace", fontSize:9, color:"rgba(96,165,250,0.55)", transition:"opacity 0.4s", opacity:visible?1:0 }}>{items[idx]}</span>;
}
Ticker.propTypes = { items: PropTypes.arrayOf(PropTypes.string).isRequired };

/* ══════════════════════════════════════════════════════
   APP PRINCIPAL
══════════════════════════════════════════════════════ */
export default function App() {
  const [tab,       setTab]       = useState("sim");
  const [metodo,    setMetodo]    = useState("simpson13");
  const [funcion,   setFuncion]   = useState("sqrt(x + 5)");
  const [limiteA,   setLimiteA]   = useState("0");
  const [limiteB,   setLimiteB]   = useState("19");
  const [nVal,      setNVal]      = useState(6);
  const [showTeam,  setShowTeam]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [tabla,     setTabla]     = useState([]);
  const [delta,     setDelta]     = useState(null);
  const [sumatoria, setSumatoria] = useState(null);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [time,      setTime]      = useState("");

  const m = METHODS[metodo];

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-CO", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const getStep = () => metodo === "simpson38" ? 3 : (metodo === "simpson13" || metodo === "abierto") ? 2 : 1;

  const calcular = useCallback(() => {
    setError(""); setLoading(true);
    setTimeout(() => {
      try {
        const a = parseFloat(limiteA), b = parseFloat(limiteB);
        if (isNaN(a) || isNaN(b)) throw new Error("Los límites deben ser valores numéricos válidos.");
        if (a >= b) throw new Error("El límite superior (b) debe ser mayor que el inferior (a).");
        let n = m.fixN(nVal); setNVal(n);
        const dlt = (b - a) / n;
        const expr = math.compile(funcion);
        const f = x => { const r = expr.evaluate({ x }); if (typeof r === "object" && r.isComplex) throw new Error("Valor complejo."); return r; };
        let sum = 0, rows = [];
        for (let i = 0; i <= n; i++) {
          const xi = a+i*dlt, fxi = f(xi), coef = m.coeffRule(i,n), parcial = coef*fxi;
          sum += parcial;
          rows.push({ i, xi, fxi, coef, parcial });
        }
        const integral = m.compute(dlt, sum);
        setDelta(dlt); setTabla(rows); setSumatoria(sum); setResult(integral);
      } catch (e) { setError(e.message || "Error en la expresión."); }
      finally { setLoading(false); }
    }, 700);
  }, [limiteA, limiteB, m, nVal, funcion]);

  const reset = () => { setResult(null); setTabla([]); setDelta(null); setSumatoria(null); setError(""); };

  const tickerItems = [`∫ f(x)dx ≈ Σ wᵢf(xᵢ)`, `Δ = (b − a) / n`, `ERROR ~ O(h⁴)`, `Newton-Cotes · ${new Date().getFullYear()}`];

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:"#020816", minHeight:"100vh", color:"#e2e8f0", position:"relative", overflowX:"hidden" }}>

      <PremiumBackground activeColor={m.color} />
      <GridOverlay />
      <div style={{ position:"fixed", inset:0, background:"rgba(2,8,22,0.58)", pointerEvents:"none", zIndex:0 }}/>

      {/* HEADER */}
      <header style={{ position:"relative", zIndex:100, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ background:"rgba(2,8,22,0.92)", borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"0 2.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:32 }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#22d3ee", animation:"dotPulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize:9, color:"#1e3a5f", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>SYS ONLINE</span>
            </div>
            <Ticker items={tickerItems} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontSize:9, fontFamily:"monospace", color:"#1e3a5f" }}>UTC-5 · {time}</span>
            <span style={{ fontSize:9, color:"#0f2443" }}>|</span>
            <span style={{ fontSize:9, fontFamily:"monospace", color:"#1e3a5f" }}>MÉTODO · {metodo.toUpperCase()}</span>
          </div>
        </div>

        <div style={{ position:"relative", padding:"2rem 2.5rem 1.8rem", overflow:"hidden" }}>
          {[{top:0,left:0,borderTop:"1.5px solid",borderLeft:"1.5px solid"},{top:0,right:0,borderTop:"1.5px solid",borderRight:"1.5px solid"},{bottom:0,left:0,borderBottom:"1.5px solid",borderLeft:"1.5px solid"},{bottom:0,right:0,borderBottom:"1.5px solid",borderRight:"1.5px solid"}].map((s,i) => (
            <div key={i} style={{ position:"absolute", width:72, height:72, borderColor:`${m.color}55`, ...s, pointerEvents:"none", zIndex:2, transition:"border-color 0.8s" }}/>
          ))}
          <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:1, background:`linear-gradient(90deg, transparent, ${m.color}70, rgba(124,58,237,0.5), ${m.color}70, transparent)`, transition:"background 0.8s" }}/>

          <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", gap:24, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.28)", borderRadius:50, padding:"5px 18px", marginBottom:18 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#38bdf8", animation:"dotPulse 2.5s ease-in-out infinite" }}/>
                <span style={{ color:"#7dd3fc", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Fundación Universitaria Tecnológico Comfenalco</span>
              </div>

              {/*
                ════════════════════════════════════════════════
                FIX DEL TÍTULO:
                El bug ocurre porque WebkitTextFillColor: transparent
                queda "pegado" cuando React reutiliza el nodo DOM al
                cambiar sólo el color de fondo del gradiente.
                Solución: key={metodo} fuerza a React a desmontar y
                remontar el <span> completo al cambiar de método,
                limpiando cualquier estado CSS residual del browser.
                ════════════════════════════════════════════════
              */}
              <h1 style={{ color:"#f8fafc", fontSize:"clamp(1.7rem, 4.5vw, 2.8rem)", fontWeight:900, margin:"0 0 12px", lineHeight:1.08, letterSpacing:"-0.03em" }}>
                Sistema de{" "}
                <span
                  key={metodo}
                  style={{
                    background: `linear-gradient(135deg, ${m.accentDark} 0%, ${m.color} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    display: "inline",
                  }}
                >
                  Integración Numérica
                </span>
              </h1>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <p style={{ color:"#334155", fontSize:13, margin:0, fontWeight:500 }}>Trabajo Final · Métodos Numéricos · Newton-Cotes</p>
                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                  {[m.color,"#7c3aed","#0891b2"].map((c,i) => (
                    <div key={i} style={{ width:4, height:4, borderRadius:"50%", background:c, animation:`dotPulse 2s ease-in-out ${i*0.45}s infinite`, opacity:0.65 }}/>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setShowTeam(true)}
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#cbd5e1", borderRadius:16, padding:"13px 26px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:10, backdropFilter:"blur(10px)", transition:"all 0.3s" }}
              onMouseEnter={e => { e.currentTarget.style.background=`${m.color}22`; e.currentTarget.style.borderColor=`${m.color}55`; e.currentTarget.style.transform="translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.transform="none"; }}>
              <span style={{ fontSize:16 }}>👥</span> Ver Autores
            </button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"1.6rem 2rem 0", position:"relative", zIndex:10 }}>
        <div style={{ display:"inline-flex", gap:3, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:5, backdropFilter:"blur(12px)" }}>
          {[{id:"sim",label:"Simulador",icon:"⊕"},{id:"teoria",label:"Marco Teórico",icon:"∂"}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"10px 26px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, letterSpacing:"0.04em", transition:"all 0.3s", background:tab===t.id?`linear-gradient(135deg, ${m.color}30, ${m.color}18)`:"transparent", color:tab===t.id?m.accentDark:"#334155", boxShadow:tab===t.id?`0 2px 20px ${m.color}25, inset 0 0 0 1px ${m.color}30`:"none" }}>
              <span style={{ marginRight:7, fontSize:14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SIMULADOR */}
      {tab === "sim" && (
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"1.6rem 2rem 4rem", display:"grid", gridTemplateColumns:"400px 1fr", gap:22, alignItems:"start", position:"relative", zIndex:10 }}>

          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <GlassCard style={{ padding:22 }} delay={0}>
              <p style={{ fontSize:9, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.14em", margin:"0 0 16px" }}>Algoritmo Analítico</p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {Object.entries(METHODS).map(([key, md]) => {
                  const sel = metodo === key;
                  return (
                    <button key={key} onClick={() => { setMetodo(key); reset(); }}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 15px", borderRadius:14, border:`1px solid ${sel?md.color+"50":"rgba(255,255,255,0.05)"}`, background:sel?`linear-gradient(135deg, ${md.color}20, ${md.color}10)`:"rgba(255,255,255,0.02)", cursor:"pointer", transition:"all 0.3s", transform:sel?"scale(1.018)":"scale(1)", boxShadow:sel?`0 6px 28px ${md.color}25`:"none", textAlign:"left" }}>
                      <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, background:sel?`${md.color}28`:"rgba(255,255,255,0.04)", border:`1px solid ${sel?md.color+"45":"rgba(255,255,255,0.07)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:900, color:sel?md.accentDark:"#334155" }}>{md.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:sel?md.accentDark:"#94a3b8" }}>{md.title}</div>
                        <div style={{ fontSize:9, color:"#1e3a5f", marginTop:2 }}>{md.subtitle} · {md.restriccion}</div>
                      </div>
                      {sel && <div style={{ width:8, height:8, borderRadius:"50%", background:md.accentDark, animation:"dotPulse 2s ease-in-out infinite", flexShrink:0 }}/>}
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard style={{ padding:22 }} delay={0.06}>
              <p style={{ fontSize:9, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.14em", margin:"0 0 18px" }}>Parámetros de Entrada</p>
              <p style={{ fontSize:9, color:"#1e3a5f", fontWeight:700, marginBottom:9, textTransform:"uppercase", letterSpacing:"0.09em" }}>Preajustes f(x)</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
                {FX_PRESETS.map(p => (
                  <button key={p.value} onClick={() => { setFuncion(p.value); reset(); }}
                    style={{ padding:"5px 13px", borderRadius:9, border:"1px solid", borderColor:funcion===p.value?m.color+"60":"rgba(255,255,255,0.07)", background:funcion===p.value?`${m.color}22`:"rgba(255,255,255,0.03)", color:funcion===p.value?m.accentDark:"#334155", fontSize:11, fontFamily:"monospace", fontWeight:700, cursor:"pointer" }}>{p.label}</button>
                ))}
              </div>
              <label style={{ display:"block", fontSize:9, fontWeight:700, color:"#1e3a5f", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.08em" }}>Función objetivo f(x)</label>
              <input value={funcion} onChange={e => setFuncion(e.target.value)}
                style={{ width:"100%", padding:"11px 15px", borderRadius:12, border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.04)", fontSize:14, fontFamily:"'Fira Code', monospace", color:"#e2e8f0", outline:"none", boxSizing:"border-box", marginBottom:18 }}
                placeholder="ej. sqrt(x+5)"
                onFocus={e => { e.target.style.borderColor=m.color+"60"; e.target.style.boxShadow=`0 0 0 3px ${m.color}18`; }}
                onBlur={e => { e.target.style.borderColor="rgba(255,255,255,0.09)"; e.target.style.boxShadow="none"; }}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
                <LimitInputDark label="Límite inferior (a)" value={limiteA} onChange={v => { setLimiteA(v); reset(); }}/>
                <LimitInputDark label="Límite superior (b)" value={limiteB} onChange={v => { setLimiteB(v); reset(); }}/>
              </div>
              <NControlDark value={nVal} onChange={setNVal} min={metodo==="boole"?4:2} max={30} step={getStep()} disabled={metodo==="boole"} color={m.color} accentDark={m.accentDark}/>
              {error && <div style={{ marginTop:14, background:"rgba(190,18,60,0.12)", border:"1px solid rgba(190,18,60,0.35)", borderRadius:12, padding:"11px 15px", color:"#fca5a5", fontSize:12, fontWeight:600 }}>⚠️ {error}</div>}
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={reset} style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#475569", fontWeight:700, fontSize:12, cursor:"pointer" }}>↺ Resetear</button>
                <button onClick={calcular} disabled={loading}
                  style={{ flex:2.2, padding:"13px", borderRadius:13, border:"none", background:loading?"#0f172a":`linear-gradient(135deg, ${m.color}, ${m.color}cc)`, color:loading?"#334155":"#fff", fontWeight:800, fontSize:13, cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":`0 6px 28px ${m.color}45`, transition:"all 0.35s" }}>
                  {loading ? "⟳ Calculando..." : "∫ Calcular Integral"}
                </button>
              </div>
            </GlassCard>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <GlassCard style={{ padding:26 }} glow={m.color} delay={0.1}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                <div>
                  <p style={{ fontSize:9, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.13em", margin:"0 0 7px" }}>Fórmula Activa</p>
                  <h3 style={{ color:"#f1f5f9", fontSize:16, fontWeight:800, margin:0 }}>{m.title} <span style={{ color:"#334155", fontWeight:400 }}>—</span> {m.subtitle}</h3>
                </div>
                <div style={{ background:`${m.color}1a`, border:`1px solid ${m.color}40`, borderRadius:10, padding:"7px 16px", color:m.accentDark, fontSize:10, fontWeight:800, fontFamily:"monospace", flexShrink:0 }}>{metodo}</div>
              </div>
              <div style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:13, padding:"18px 20px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Georgia', serif", fontSize:13.5, color:m.accentDark, letterSpacing:"0.05em", lineHeight:1.9 }}>{m.formulaShort}</div>
              </div>
              <p style={{ color:"#334155", fontSize:12, lineHeight:1.65, margin:"13px 0 0" }}>{m.desc}</p>
            </GlassCard>

            <GlassCard style={{ padding:24 }} delay={0.14}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <p style={{ fontSize:9, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.13em", margin:"0 0 6px" }}>Visualización Geométrica</p>
                  <h4 style={{ fontSize:13, fontWeight:800, margin:0, color:"#94a3b8", fontFamily:"monospace" }}>
                    <span style={{ color:m.accentDark }}>{funcion||"f(x)"}</span>
                    <span style={{ color:"#334155" }}> ∈ [{limiteA}, {limiteB}]</span>
                  </h4>
                </div>
                {result !== null && (
                  <div style={{ background:`${m.color}18`, border:`1px solid ${m.color}30`, borderRadius:11, padding:"7px 14px", display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:m.accentDark, animation:"dotPulse 2s ease-in-out infinite" }}/>
                    <span style={{ fontSize:12, fontWeight:800, color:m.accentDark, fontFamily:"monospace" }}>∫ ≈ {result?.toFixed(6)}</span>
                  </div>
                )}
              </div>
              <div style={{ background:"rgba(0,0,0,0.28)", borderRadius:14, padding:"12px 8px", border:"1px solid rgba(255,255,255,0.04)" }}>
                <IntegralChart funcion={funcion} limiteA={limiteA} limiteB={limiteB} tabla={result!==null?tabla:[]} metodo={metodo} color={m.color}/>
              </div>
              {result === null && <p style={{ fontSize:11, color:"#1e3a5f", textAlign:"center", marginTop:11, fontStyle:"italic" }}>Calcula la integral para ver los nodos de integración sobre la curva.</p>}
            </GlassCard>

            {result !== null && !loading && (
              <GlassCard style={{ padding:24 }} delay={0}>
                <p style={{ fontSize:9, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.13em", margin:"0 0 18px" }}>Resultados de la Integración</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                  {[
                    { label:"Diferencial Δ",  value:delta?.toFixed(6),          c:"#334155",    big:false },
                    { label:"∫ Resultado",     value:<CountUp value={result} decimals={8}/>, c:m.accentDark, big:true  },
                    { label:"Σ Acumulada",     value:sumatoria?.toFixed(8),      c:"#94a3b8",    big:false },
                    { label:"Subintervalos",   value:tabla.length-1,             c:"#94a3b8",    big:false },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background:kpi.big?`${m.color}12`:"rgba(255,255,255,0.03)", borderRadius:14, padding:kpi.big?"18px 20px":"15px 17px", border:`1px solid ${kpi.big?m.color+"30":"rgba(255,255,255,0.05)"}` }}>
                      <span style={{ fontSize:8, color:"#1e3a5f", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", display:"block", marginBottom:8 }}>{kpi.label}</span>
                      <span style={{ fontFamily:"'Fira Code', monospace", fontWeight:900, color:kpi.c, fontSize:kpi.big?18:14, display:"block" }}>{kpi.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, overflow:"hidden" }}>
                  <div style={{ background:"rgba(0,0,0,0.35)", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 1fr", gap:8 }}>
                    {["Xᵢ","Coef · f(xᵢ)","f(xᵢ)","Parcial"].map(h => <span key={h} style={{ fontSize:8, fontWeight:800, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.11em" }}>{h}</span>)}
                  </div>
                  <div style={{ maxHeight:210, overflowY:"auto" }}>
                    {tabla.map((row, idx) => (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 1fr", gap:8, padding:"9px 16px", background:idx%2===0?"rgba(255,255,255,0.018)":"transparent", borderBottom:idx<tabla.length-1?"1px solid rgba(255,255,255,0.03)":"none" }}>
                        <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#64748b" }}>{row.xi.toFixed(4)}</span>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:m.accentDark, fontWeight:600 }}>{row.coef} × f({row.xi.toFixed(3)})</span>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"#475569" }}>{row.fxi.toFixed(5)}</span>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:800, color:"#34d399" }}>{row.parcial.toFixed(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop:13, background:`${m.color}0e`, border:`1px solid ${m.color}22`, borderRadius:13, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#1e3a5f", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Σ Total f(xᵢ) · coef</span>
                  <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:13, color:m.accentDark }}>{sumatoria?.toFixed(10)}</span>
                </div>
              </GlassCard>
            )}

            {loading && (
              <GlassCard style={{ padding:52, display:"flex", flexDirection:"column", alignItems:"center", gap:18 }} delay={0}>
                <div style={{ position:"relative", width:56, height:56 }}>
                  <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${m.color}20`, borderTopColor:m.color, animation:"spin 0.9s linear infinite" }}/>
                  <div style={{ position:"absolute", inset:6, borderRadius:"50%", border:`1.5px solid ${m.color}15`, borderBottomColor:m.accentDark, animation:"spin 1.4s linear infinite reverse" }}/>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:m.accentDark, fontSize:14, fontWeight:900 }}>∫</div>
                </div>
                <p style={{ fontSize:13, fontWeight:700, color:"#334155", margin:0 }}>Procesando integral...</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* MARCO TEÓRICO */}
      {tab === "teoria" && (
        <div style={{ maxWidth:980, margin:"0 auto", padding:"2rem 2rem 5rem", position:"relative", zIndex:10 }}>
          <GlassCard style={{ padding:"30px 36px", marginBottom:26 }} delay={0}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:"#60a5fa", flexShrink:0 }}>∫</div>
              <div>
                <h2 style={{ color:"#f1f5f9", fontSize:22, fontWeight:900, margin:"0 0 12px" }}>Newton-Cotes · Marco Conceptual</h2>
                <p style={{ color:"#334155", fontSize:13, lineHeight:1.8, margin:0 }}>
                  Las fórmulas de Newton-Cotes aproximan integrales definidas reemplazando f(x) por un polinomio interpolador con incremento constante{" "}
                  <code style={{ fontFamily:"monospace", color:"#60a5fa", background:"rgba(37,99,235,0.12)", padding:"2px 8px", borderRadius:6 }}>Δ = (b − a) / n</code>.
                </p>
              </div>
            </div>
          </GlassCard>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
            {Object.entries(METHODS).map(([key, md], idx) => (
              <GlassCard key={key} style={{ padding:26, gridColumn:key==="abierto"?"1 / -1":"auto" }} glow={md.color} delay={idx*0.07}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:`${md.color}18`, border:`1.5px solid ${md.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:md.accentDark }}>{md.icon}</div>
                  <div>
                    <h3 style={{ fontSize:15, fontWeight:800, margin:0, color:"#e2e8f0" }}>{md.title}</h3>
                    <span style={{ fontSize:10, color:"#334155" }}>{md.subtitle}</span>
                  </div>
                </div>
                <p style={{ fontSize:12, color:"#334155", lineHeight:1.7, margin:"0 0 16px" }}>{md.desc}</p>
                <div style={{ background:"rgba(0,0,0,0.4)", borderRadius:12, padding:"15px", textAlign:"center", border:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontFamily:"Georgia, serif", fontSize:12.5, color:md.accentDark, lineHeight:1.9 }}>{md.formulaShort}</div>
                </div>
                <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:7, background:`${md.color}15`, border:`1px solid ${md.color}28`, borderRadius:50, padding:"4px 14px" }}>
                  <span style={{ fontSize:10, color:md.accentDark, fontWeight:700 }}>⚡ {md.restriccion}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {showTeam && <TeamModal onClose={() => setShowTeam(false)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap');
        @keyframes slideUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn    { from { opacity:0; transform:scale(0.90); } to { opacity:1; transform:scale(1); } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes dotPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        input[type=number] { -moz-appearance:textfield; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:rgba(0,0,0,0.15); }
        ::-webkit-scrollbar-thumb { background:#0f2443; border-radius:10px; }
        input::placeholder { color:#0f2443; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}
