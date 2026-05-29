import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    restriccion: "n par", icon: "⅓", hue: 220,
    accent: "#2563EB", soft: "#DBEAFE", text: "#1E3A8A", border: "#93C5FD", bg: "#EFF6FF",
    formulaShort: "I = Δ/3 · [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ··· + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
    compute: (delta, sum) => (delta / 3) * sum,
    fixN: (n) => n % 2 !== 0 ? Math.ceil(n / 2) * 2 : n,
  },
  simpson38: {
    title: "Simpson 3/8", subtitle: "Newton-Cotes cerrado",
    desc: "Aproximación cúbica con 4 puntos. Requiere múltiplos de 3 subintervalos.",
    restriccion: "n múltiplo de 3", icon: "⅜", hue: 270,
    accent: "#7C3AED", soft: "#EDE9FE", text: "#3B0764", border: "#C4B5FD", bg: "#F5F3FF",
    formulaShort: "I = 3Δ/8 · [f(x₁) + 3f(x₂) + 3f(x₃) + f(x₄)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : i % 3 === 0 ? 2 : 3,
    compute: (delta, sum) => (3 * delta / 8) * sum,
    fixN: (n) => n % 3 !== 0 ? Math.ceil(n / 3) * 3 : n,
  },
  trapezoidal: {
    title: "Trapezoidal", subtitle: "Regla compuesta",
    desc: "Aproxima el área bajo la curva con trapecios. Soporta cualquier n ≥ 1.",
    restriccion: "n ≥ 1", icon: "⌗", hue: 195,
    accent: "#0891B2", soft: "#CFFAFE", text: "#164E63", border: "#67E8F9", bg: "#ECFEFF",
    formulaShort: "I = Δ/2 · [f(x₀) + 2f(x₁) + ··· + 2f(xₙ₋₁) + f(xₙ)]",
    coeffRule: (i, n) => i === 0 || i === n ? 1 : 2,
    compute: (delta, sum) => (delta / 2) * sum,
    fixN: (n) => n,
  },
  boole: {
    title: "Boole", subtitle: "Newton-Cotes orden 4",
    desc: "Regla cerrada de quinto orden. Fijo en 4 subintervalos (5 puntos).",
    restriccion: "n = 4 fijo", icon: "B", hue: 340,
    accent: "#BE185D", soft: "#FCE7F3", text: "#500724", border: "#F9A8D4", bg: "#FFF0F6",
    formulaShort: "I = 2Δ/45 · [7f(x₁) + 32f(x₂) + 12f(x₃) + 32f(x₄) + 7f(x₅)]",
    coeffRule: (i) => [7, 32, 12, 32, 7][i],
    compute: (delta, sum) => (2 * delta / 45) * sum,
    fixN: () => 4,
  },
  abierto: {
    title: "Fórmula Abierta", subtitle: "Regla compuesta",
    desc: "Esquema compuesto alternante (1, 4, 2, 4, ...). n par requerido.",
    restriccion: "n par", icon: "∑", hue: 155,
    accent: "#059669", soft: "#D1FAE5", text: "#022C22", border: "#6EE7B7", bg: "#ECFDF5",
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

/* ══════════════════════════════════════════
   HEADER CANVAS (oscuro, animado)
══════════════════════════════════════════ */
function HeaderCanvas({ m }) {
  const canvasRef = useRef(null);
  const mRef = useRef(m);
  useEffect(() => { mRef.current = m; }, [m]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, W, H;

    const waves = Array.from({ length: 5 }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + i * 0.002,
      amp: 18 + i * 8,
      freq: 0.006 - i * 0.0008,
      yRatio: 0.2 + i * 0.18,
      opacity: 0.12 - i * 0.018,
    }));

    const nodes = Array.from({ length: 30 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 3 + 1.5,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0002,
      alpha: Math.random() * 0.5 + 0.2,
      ph: Math.random() * Math.PI * 2,
      ps: 0.02 + Math.random() * 0.03,
    }));

    const gridLines = Array.from({ length: 7 }, (_, i) => ({
      type: i < 4 ? "h" : "v",
      ratio: i < 4 ? (i + 1) / 5 : (i - 3) / 4,
    }));

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = (ts) => {
      if (!W || !H) { raf = requestAnimationFrame(loop); return; }
      const mm = mRef.current;
      const hue = mm.hue;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `hsl(${hue}, 40%, 8%)`;
      ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W * 0.25, H * 0.5, 0, W * 0.25, H * 0.5, W * 0.6);
      rg.addColorStop(0, `hsla(${hue}, 80%, 55%, 0.18)`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      const rg2 = ctx.createRadialGradient(W * 0.85, H * 0.3, 0, W * 0.85, H * 0.3, W * 0.4);
      rg2.addColorStop(0, `hsla(${hue + 40}, 70%, 60%, 0.12)`);
      rg2.addColorStop(1, "transparent");
      ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `hsla(${hue}, 50%, 70%, 0.08)`;
      for (let gx = 0; gx <= W; gx += 36) for (let gy = 0; gy <= H; gy += 36) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      gridLines.forEach(gl => {
        ctx.save(); ctx.strokeStyle = `hsla(${hue}, 60%, 65%, 0.07)`;
        ctx.lineWidth = 0.5; ctx.setLineDash([4, 8]); ctx.beginPath();
        if (gl.type === "h") { ctx.moveTo(0, H * gl.ratio); ctx.lineTo(W, H * gl.ratio); }
        else { ctx.moveTo(W * gl.ratio, 0); ctx.lineTo(W * gl.ratio, H); }
        ctx.stroke(); ctx.restore();
      });
      const t = ts * 0.001;
      waves.forEach(w => {
        ctx.save(); ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${w.opacity})`;
        ctx.lineWidth = 1.5; ctx.beginPath();
        for (let px = 0; px <= W; px += 2) {
          const py = H * w.yRatio + Math.sin(px * w.freq + w.phase + t * w.speed * 100) * w.amp;
          px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.restore();
      });
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.ph += n.ps;
        if (n.x < 0) n.x = 1; if (n.x > 1) n.x = 0;
        if (n.y < 0) n.y = 1; if (n.y > 1) n.y = 0;
      });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const dx = (nodes[i].x - nodes[j].x) * W, dy = (nodes[i].y - nodes[j].y) * H;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.save(); ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${(1 - dist / 120) * 0.12})`;
          ctx.lineWidth = 0.5; ctx.beginPath();
          ctx.moveTo(nodes[i].x * W, nodes[i].y * H); ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
          ctx.stroke(); ctx.restore();
        }
      }
      nodes.forEach(n => {
        const pulse = 0.4 + Math.sin(n.ph) * 0.3;
        ctx.save(); ctx.globalAlpha = n.alpha * pulse;
        ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
        ctx.beginPath(); ctx.arc(n.x * W, n.y * H, n.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      ctx.save(); ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.35)`; ctx.lineWidth = 2; ctx.beginPath();
      const curveX = W * 0.55, curveW = W * 0.42;
      for (let i = 0; i <= 80; i++) {
        const px = curveX + (i / 80) * curveW, rel = i / 80;
        const py = H * 0.5 - (Math.sin(rel * Math.PI) * H * 0.32) - (Math.sin(rel * Math.PI * 2) * H * 0.08);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const px = curveX + (i / 80) * curveW, rel = i / 80;
        const py = H * 0.5 - (Math.sin(rel * Math.PI) * H * 0.32) - (Math.sin(rel * Math.PI * 2) * H * 0.08);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.lineTo(curveX + curveW, H * 0.5); ctx.lineTo(curveX, H * 0.5); ctx.closePath();
      const fg = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.5);
      fg.addColorStop(0, `hsla(${hue}, 85%, 65%, 0.22)`);
      fg.addColorStop(1, `hsla(${hue}, 85%, 65%, 0.03)`);
      ctx.fillStyle = fg; ctx.fill(); ctx.restore();
      for (let s = 0; s <= 6; s++) {
        const rel = s / 6, px = curveX + rel * curveW;
        const py = H * 0.5 - (Math.sin(rel * Math.PI) * H * 0.32) - (Math.sin(rel * Math.PI * 2) * H * 0.08);
        ctx.save(); ctx.fillStyle = "white"; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.25)`;
        ctx.lineWidth = 0.8; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, H * 0.5); ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = `hsla(${hue}, 60%, 65%, 0.3)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(curveX - 10, H * 0.5); ctx.lineTo(curveX + curveW + 10, H * 0.5); ctx.stroke(); ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════
   BODY CANVAS — PREMIUM ANIMADO
   Mesh warp · Orbs multicapa · Rayos de luz
   Fluid lines · Partículas · Vignette
══════════════════════════════════════════ */
function BodyCanvas({ m }) {
  const canvasRef = useRef(null);
  const mRef = useRef(m);
  useEffect(() => { mRef.current = m; }, [m]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, W, H;

    // === Mesh grid warp
    const COLS = 18, ROWS = 10;
    const mesh = [];
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) {
      mesh.push({
        bx: c / COLS, by: r / ROWS,
        ph: Math.random() * Math.PI * 2,
        amp: 0.012 + Math.random() * 0.018,
        spd: 0.0004 + Math.random() * 0.0003,
        ox: (Math.random() - 0.5) * 0.018,
        oy: (Math.random() - 0.5) * 0.014,
      });
    }

    // === Orbs luminosas multicapa
    const orbs = Array.from({ length: 9 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 160 + Math.random() * 180,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00009,
      ph: Math.random() * Math.PI * 2,
      ps: 0.002 + Math.random() * 0.003,
      hOff: (Math.random() - 0.5) * 35,
    }));

    // === Fluid sinusoidal lines
    const fluidLines = Array.from({ length: 7 }, (_, i) => ({
      seed: Math.random() * 1000,
      spd: 0.00018 + i * 0.00004,
      yRat: 0.08 + i * 0.12,
      amp: 28 + i * 14,
      freq: 0.0045 - i * 0.0003,
      w: 1.2 - i * 0.1,
    }));

    // === Partículas flotantes
    const parts = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.7 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.00015,
      ph: Math.random() * Math.PI * 2,
      ps: 0.008 + Math.random() * 0.015,
      a: 0.08 + Math.random() * 0.22,
    }));

    // === Rayos de luz diagonales sutiles
    const beams = Array.from({ length: 4 }, (_, i) => ({
      x: 0.1 + i * 0.28,
      ph: Math.random() * Math.PI * 2,
      ps: 0.0005 + i * 0.0002,
      w: 40 + Math.random() * 60,
    }));

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const getPos = (r, c, t) => {
      const node = mesh[r * (COLS + 1) + c];
      const dx = Math.sin(t * node.spd * 100 + node.ph) * node.amp * W;
      const dy = Math.cos(t * node.spd * 80 + node.ph * 1.3) * node.amp * H;
      return { x: node.bx * W + dx + node.ox * W, y: node.by * H + dy + node.oy * H };
    };

    const loop = (ts) => {
      const t = ts * 0.001;
      if (!W || !H) { raf = requestAnimationFrame(loop); return; }
      const hue = mRef.current.hue;

      ctx.clearRect(0, 0, W, H);

      // Base blanca
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      // ── Rayos de luz verticales pulsantes
      beams.forEach(b => {
        const pulse = 0.018 + Math.sin(b.ph + t * b.ps * 100) * 0.009;
        b.ph += b.ps;
        const cx = b.x * W;
        const grad = ctx.createLinearGradient(cx - b.w, 0, cx + b.w, H);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.3, `hsla(${hue},80%,65%,${pulse})`);
        grad.addColorStop(0.5, `hsla(${hue + 20},75%,70%,${pulse * 1.4})`);
        grad.addColorStop(0.7, `hsla(${hue},80%,65%,${pulse})`);
        grad.addColorStop(1, "transparent");
        ctx.save(); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H); ctx.restore();
      });

      // ── Orbs multicapa con núcleo especular
      orbs.forEach(o => {
        o.x += o.vx; o.y += o.vy; o.ph += o.ps;
        if (o.x < -0.3) o.x = 1.3; if (o.x > 1.3) o.x = -0.3;
        if (o.y < -0.3) o.y = 1.3; if (o.y > 1.3) o.y = -0.3;
        const p = 0.032 + Math.sin(o.ph) * 0.014;
        const cx = o.x * W, cy = o.y * H;
        // Halo exterior difuso
        const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r);
        g1.addColorStop(0, `hsla(${hue + o.hOff},85%,72%,${p})`);
        g1.addColorStop(0.4, `hsla(${hue + o.hOff + 15},75%,78%,${p * 0.55})`);
        g1.addColorStop(0.75, `hsla(${hue + o.hOff},65%,85%,${p * 0.2})`);
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx, cy, o.r, 0, Math.PI * 2); ctx.fill();
        // Núcleo especular brillante
        const g2 = ctx.createRadialGradient(cx - o.r * 0.15, cy - o.r * 0.15, 0, cx, cy, o.r * 0.35);
        g2.addColorStop(0, `hsla(${hue + o.hOff},95%,92%,${p * 1.8})`);
        g2.addColorStop(1, "transparent");
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, o.r * 0.5, 0, Math.PI * 2); ctx.fill();
      });

      // ── Mesh warp orgánica
      ctx.lineWidth = 0.4;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const p00 = getPos(r, c, t), p10 = getPos(r, c + 1, t);
          const p01 = getPos(r + 1, c, t), p11 = getPos(r + 1, c + 1, t);
          const mcx = (p00.x + p10.x + p01.x + p11.x) / 4;
          const mcy = (p00.y + p10.y + p01.y + p11.y) / 4;
          const distC = Math.sqrt((mcx / W - 0.5) ** 2 + (mcy / H - 0.5) ** 2);
          const cellA = 0.04 + (1 - distC) * 0.06;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y); ctx.closePath();
          ctx.strokeStyle = `hsla(${hue},55%,55%,${cellA * 0.6})`;
          ctx.stroke();
        }
      }

      // ── Fluid lines con gradiente lateral
      fluidLines.forEach(fl => {
        ctx.lineWidth = fl.w;
        const opBase = 0.06 + (1 - fl.yRat) * 0.08;
        ctx.beginPath();
        for (let px = 0; px <= W; px += 2) {
          const rel = px / W;
          const py = H * fl.yRat
            + Math.sin(rel * Math.PI * 3 + t * fl.spd * 100 + fl.seed) * fl.amp
            + Math.sin(rel * Math.PI * 5.5 + t * fl.spd * 70 + fl.seed * 2) * fl.amp * 0.35
            + Math.sin(rel * Math.PI * 1.8 + t * fl.spd * 40) * fl.amp * 0.5;
          px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        const lg = ctx.createLinearGradient(0, 0, W, 0);
        lg.addColorStop(0, "transparent");
        lg.addColorStop(0.15, `hsla(${hue},75%,55%,${opBase})`);
        lg.addColorStop(0.5, `hsla(${hue + 25},80%,60%,${opBase * 1.6})`);
        lg.addColorStop(0.85, `hsla(${hue},75%,55%,${opBase})`);
        lg.addColorStop(1, "transparent");
        ctx.strokeStyle = lg; ctx.stroke();
      });

      // ── Partículas flotantes + conexiones
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.ph += p.ps;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      });
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = (parts[i].x - parts[j].x) * W, dy = (parts[i].y - parts[j].y) * H;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.strokeStyle = `hsla(${hue},60%,50%,${(1 - d / 80) * 0.06})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(parts[i].x * W, parts[i].y * H);
            ctx.lineTo(parts[j].x * W, parts[j].y * H);
            ctx.stroke();
          }
        }
      }
      parts.forEach(p => {
        const a = p.a * (0.5 + Math.sin(p.ph) * 0.5);
        ctx.fillStyle = `hsla(${hue},65%,50%,${a})`;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2); ctx.fill();
      });

      // ── Cuadrícula de puntos
      const gs = 52;
      ctx.fillStyle = `hsla(${hue},50%,50%,0.07)`;
      for (let gx = gs / 2; gx <= W; gx += gs) {
        for (let gy = gs / 2; gy <= H; gy += gs) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ── Vignette perimetral suave
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, `hsla(${hue},30%,88%,0.18)`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

/* ─── COUNT UP ─── */
function CountUp({ value, decimals = 8 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (value === null) return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1200, 1);
      setDisplay(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  if (value === null) return <span>—</span>;
  return <span>{display.toFixed(decimals)}</span>;
}

/* ─── CHART ─── */
function IntegralChart({ funcion, limiteA, limiteB, tabla, metodo, m }) {
  const W = 560, H = 280, PAD = { t: 28, r: 20, b: 46, l: 60 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;

  const data = useMemo(() => {
    try {
      const a = parseFloat(limiteA), b = parseFloat(limiteB);
      if (isNaN(a) || isNaN(b) || a >= b) return null;
      const expr = math.compile(funcion);
      const pts = [];
      for (let i = 0; i <= 200; i++) {
        const x = a + (b - a) * (i / 200);
        try {
          const y = expr.evaluate({ x });
          if (typeof y === "number" && isFinite(y)) pts.push({ x, y });
        } catch {}
      }
      return pts;
    } catch { return null; }
  }, [funcion, limiteA, limiteB]);

  if (!data || data.length < 2) return (
    <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
      Sin datos para graficar
    </div>
  );

  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);
  const pad = (rawMaxY - rawMinY) * 0.12 || 1;
  const minY = Math.min(rawMinY - pad, 0), maxY = rawMaxY + pad;
  const rangeY = maxY - minY || 1;
  const sx = x => PAD.l + ((x - minX) / (maxX - minX)) * innerW;
  const sy = y => PAD.t + innerH - ((y - minY) / rangeY) * innerH;
  const curve = data.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" ");
  const fill = `${curve} L${sx(data[data.length - 1].x).toFixed(2)},${sy(0).toFixed(2)} L${sx(data[0].x).toFixed(2)},${sy(0).toFixed(2)} Z`;
  const zeroY = sy(0);
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + (rangeY * i) / 4);
  const xTicks = Array.from({ length: 6 }, (_, i) => minX + ((maxX - minX) * i) / 5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id={`fg${metodo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={m.accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={m.accent} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={`chartBg${metodo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
        <clipPath id={`clip${metodo}`}><rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} /></clipPath>
        <filter id="softShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={m.accent} floodOpacity="0.18" />
        </filter>
      </defs>
      <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} fill={`url(#chartBg${metodo})`} rx="6" />
      {yTicks.map((v, i) => (
        <line key={i} x1={PAD.l} y1={sy(v)} x2={PAD.l + innerW} y2={sy(v)}
          stroke={i === 0 || i === 4 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)"}
          strokeWidth="0.8" strokeDasharray={i === 0 || i === 4 ? "none" : "4 6"} />
      ))}
      {xTicks.map((v, i) => (
        <line key={i} x1={sx(v)} y1={PAD.t} x2={sx(v)} y2={PAD.t + innerH}
          stroke="rgba(0,0,0,0.05)" strokeWidth="0.8" strokeDasharray="4 6" />
      ))}
      {zeroY >= PAD.t && zeroY <= PAD.t + innerH && (
        <line x1={PAD.l} y1={zeroY} x2={PAD.l + innerW} y2={zeroY}
          stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
      )}
      <g clipPath={`url(#clip${metodo})`}>
        {(tabla || []).slice(0, -1).map((row, i) => {
          const nr = (tabla || [])[i + 1];
          if (!nr) return null;
          return (
            <polygon key={i}
              points={`${sx(row.xi)},${sy(0)} ${sx(row.xi)},${sy(row.fxi)} ${sx(nr.xi)},${sy(nr.fxi)} ${sx(nr.xi)},${sy(0)}`}
              fill={m.accent} fillOpacity="0.13" stroke={m.accent} strokeOpacity="0.45" strokeWidth="1" />
          );
        })}
        <path d={fill} fill={`url(#fg${metodo})`} />
        <path d={curve} fill="none" stroke={m.accent} strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#softShadow)" />
      </g>
      {(tabla || []).map((row, i) => {
        const cx = sx(row.xi), cy = sy(row.fxi);
        if (cx < PAD.l - 2 || cx > PAD.l + innerW + 2) return null;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="7" fill={m.accent} fillOpacity="0.12" />
            <circle cx={cx} cy={cy} r="4.5" fill="white" stroke={m.accent} strokeWidth="2" />
            <circle cx={cx} cy={cy} r="2" fill={m.accent} />
          </g>
        );
      })}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#334155" strokeWidth="1.5" />
      {yTicks.map((v, i) => (
        <g key={i}>
          <rect x={2} y={sy(v) - 8} width={PAD.l - 8} height={16} fill="rgba(255,255,255,0.85)" rx="3" />
          <text x={PAD.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10" fill="#334155"
            fontFamily="'DM Mono', 'Fira Code', monospace" fontWeight="600">{v.toFixed(2)}</text>
          <line x1={PAD.l - 3} y1={sy(v)} x2={PAD.l} y2={sy(v)} stroke="#334155" strokeWidth="1" />
        </g>
      ))}
      {xTicks.map((v, i) => (
        <g key={i}>
          <rect x={sx(v) - 20} y={PAD.t + innerH + 8} width={40} height={16} fill="rgba(255,255,255,0.85)" rx="3" />
          <text x={sx(v)} y={PAD.t + innerH + 20} textAnchor="middle" fontSize="10" fill="#334155"
            fontFamily="'DM Mono', 'Fira Code', monospace" fontWeight="600">{v.toFixed(1)}</text>
          <line x1={sx(v)} y1={PAD.t + innerH} x2={sx(v)} y2={PAD.t + innerH + 4} stroke="#334155" strokeWidth="1" />
        </g>
      ))}
      <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui" fontWeight="600">x</text>
      <text x={12} y={PAD.t + innerH / 2} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui" fontWeight="600"
        transform={`rotate(-90, 12, ${PAD.t + innerH / 2})`}>f(x)</text>
    </svg>
  );
}

/* ─── TEAM MODAL ─── */
function TeamModal({ onClose, m }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }} />
      <div
        style={{ position: "relative", background: "white", borderRadius: 24, padding: "36px 40px", width: 440, maxWidth: "92vw", boxShadow: "0 40px 80px rgba(0,0,0,0.18)", animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 3, background: `linear-gradient(90deg, transparent, ${m.accent}, transparent)`, borderRadius: "0 0 6px 6px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Métodos Numéricos · Comfenalco</p>
            <h3 style={{ color: "#0f172a", fontSize: 20, fontWeight: 800, margin: 0 }}>Equipo de Desarrollo</h3>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#94a3b8", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TEAM.map((member, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", borderRadius: 14, padding: "12px 16px", border: "1px solid #f1f5f9", animation: `slideUp 0.35s ease ${i * 0.07}s both` }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: `hsl(${member.hue},70%,92%)`, border: `2px solid hsl(${member.hue},65%,70%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: `hsl(${member.hue},60%,35%)` }}>{member.initials}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 700, margin: 0 }}>{member.name}</p>
                <p style={{ color: "#94a3b8", fontSize: 10, margin: "3px 0 0" }}>Ingeniería · Métodos Numéricos</p>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: `hsl(${member.hue},65%,55%)`, animation: `dotPulse 2s ease-in-out ${i * 0.3}s infinite` }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: "12px 16px", background: m.soft, border: `1px solid ${m.border}`, borderRadius: 12, textAlign: "center" }}>
          <p style={{ color: m.text, fontSize: 11, margin: 0, fontWeight: 600 }}>Fundación Universitaria Tecnológico Comfenalco · 2026</p>
        </div>
      </div>
    </div>
  );
}

/* ─── STEPPER ─── */
function Stepper({ label, value, onChange }) {
  const num = parseFloat(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e2e8f0", borderRadius: 11, background: "rgba(255,255,255,0.9)", overflow: "hidden", height: 42 }}>
        <button onClick={() => onChange(String((isNaN(num) ? 0 : num) - 1))}
          style={{ width: 38, height: "100%", minWidth: 38, border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "#64748b", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "center", fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#0f172a", outline: "none", padding: "0 4px" }} />
        <button onClick={() => onChange(String((isNaN(num) ? 0 : num) + 1))}
          style={{ width: 38, height: "100%", minWidth: 38, border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "#64748b", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
      </div>
    </div>
  );
}

/* ─── CARD ─── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.95)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.055), 0 1px 0 rgba(255,255,255,0.9) inset",
      ...style
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════
   APP PRINCIPAL
══════════════════════════════════════════ */
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
  const [time, setTime] = useState("");

  const m = METHODS[metodo];

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-CO", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const getStep = () => metodo === "simpson38" ? 3 : (metodo === "simpson13" || metodo === "abierto") ? 2 : 1;
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  const calcular = useCallback(() => {
    setError(""); setLoading(true);
    setTimeout(() => {
      try {
        const a = parseFloat(limiteA), b = parseFloat(limiteB);
        if (isNaN(a) || isNaN(b)) throw new Error("Los límites deben ser valores numéricos válidos.");
        if (a >= b) throw new Error("El límite superior (b) debe ser mayor que el inferior (a).");
        let n = m.fixN(nVal);
        setNVal(n);
        const dlt = (b - a) / n;
        const expr = math.compile(funcion);
        const f = x => {
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
      } finally { setLoading(false); }
    }, 600);
  }, [limiteA, limiteB, m, nVal, funcion]);

  const reset = () => { setResult(null); setTabla([]); setDelta(null); setSumatoria(null); setError(""); };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", color: "#0f172a", position: "relative", overflowX: "hidden" }}>

      {/* Fondo premium animado (fixed, detrás de todo) */}
      <BodyCanvas m={m} />

      {/* ─── HEADER ─── */}
      <header style={{ position: "relative", overflow: "hidden", height: 204, background: `hsl(${m.hue}, 40%, 8%)`, transition: "background 0.8s ease", zIndex: 10 }}>
        <HeaderCanvas m={m} />

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 28px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "dotPulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>SISTEMA EN LÍNEA</span>
            </div>
            <span style={{ fontSize: 10, color: m.accent, fontFamily: "monospace", fontWeight: 700, background: `${m.accent}22`, padding: "2px 10px", borderRadius: 50, border: `1px solid ${m.accent}44` }}>
              ∫ Newton-Cotes
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>UTC-5 · {time}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: m.accent, fontWeight: 700, background: `${m.accent}22`, padding: "2px 10px", borderRadius: 50, border: `1px solid ${m.accent}44` }}>{metodo.toUpperCase()}</span>
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", paddingTop: 34 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${m.accent}22`, border: `1px solid ${m.accent}44`, borderRadius: 50, padding: "4px 14px", marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.accent, animation: "dotPulse 2.5s ease-in-out infinite" }} />
              <span style={{ color: m.accent, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Fundación Universitaria Tecnológico Comfenalco</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 900, margin: "0 0 8px", lineHeight: 1.1, letterSpacing: "-0.03em", color: "white" }}>
              Sistema de <span style={{ color: m.accent, transition: "color 0.6s ease" }}>Integración Numérica</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: 0, fontWeight: 500 }}>Trabajo Final · Métodos Numéricos · Newton-Cotes</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <div style={{ background: `${m.accent}22`, border: `1.5px solid ${m.accent}44`, borderRadius: 14, padding: "9px 16px", display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 20, color: m.accent, fontWeight: 900 }}>{m.icon}</span>
              <div>
                <p style={{ color: "white", fontSize: 12, fontWeight: 800, margin: 0 }}>{m.title}</p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, margin: "2px 0 0" }}>{m.restriccion}</p>
              </div>
            </div>
            <button onClick={() => setShowTeam(true)}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", borderRadius: 12, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${m.accent}33`; e.currentTarget.style.borderColor = m.accent; e.currentTarget.style.color = m.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}>
              👥 Ver Autores
            </button>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${m.accent}88, transparent)` }} />
      </header>

      {/* ─── TABS ─── */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.9)", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, alignItems: "center" }}>
          {[{ id: "sim", label: "Simulador", icon: "⊕" }, { id: "teoria", label: "Marco Teórico", icon: "∂" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "14px 22px", border: "none", borderBottom: `2.5px solid ${tab === t.id ? m.accent : "transparent"}`, cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", background: "transparent", color: tab === t.id ? m.accent : "#94a3b8", transition: "all 0.25s ease" }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SIMULADOR ─── */}
      {tab === "sim" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 60px", display: "grid", gridTemplateColumns: "360px 1fr", gap: 18, alignItems: "start", position: "relative", zIndex: 1 }}>

          {/* LEFT PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Card style={{ padding: 18 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 12px" }}>Algoritmo Analítico</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Object.entries(METHODS).map(([key, md]) => {
                  const sel = metodo === key;
                  return (
                    <button key={key} onClick={() => { setMetodo(key); reset(); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, border: `1.5px solid ${sel ? md.border : "rgba(0,0,0,0.06)"}`, background: sel ? md.soft : "rgba(248,250,252,0.7)", cursor: "pointer", transition: "all 0.25s ease", transform: sel ? "scale(1.012)" : "scale(1)", boxShadow: sel ? `0 3px 14px ${md.accent}22` : "none", textAlign: "left" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: sel ? md.soft : "#f1f5f9", border: `1px solid ${sel ? md.border : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: sel ? md.accent : "#94a3b8" }}>{md.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: sel ? md.accent : "#475569" }}>{md.title}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{md.subtitle} · {md.restriccion}</div>
                      </div>
                      {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: md.accent, animation: "dotPulse 2s ease-in-out infinite", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 14px" }}>Parámetros de Entrada</p>

              <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.09em" }}>Preajustes f(x)</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {FX_PRESETS.map(p => (
                  <button key={p.value} onClick={() => { setFuncion(p.value); reset(); }}
                    style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${funcion === p.value ? m.accent : "#e2e8f0"}`, background: funcion === p.value ? m.soft : "rgba(248,250,252,0.8)", color: funcion === p.value ? m.accent : "#64748b", fontSize: 11, fontFamily: "monospace", fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease" }}>{p.label}</button>
                ))}
              </div>

              <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Función f(x)</label>
              <input value={funcion} onChange={e => { setFuncion(e.target.value); reset(); }}
                style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "rgba(248,250,252,0.9)", fontSize: 13, fontFamily: "monospace", color: "#0f172a", outline: "none", boxSizing: "border-box", marginBottom: 14, transition: "border-color 0.2s ease" }}
                placeholder="ej. sqrt(x+5)"
                onFocus={e => { e.target.style.borderColor = m.accent; e.target.style.background = m.soft; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "rgba(248,250,252,0.9)"; }} />

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Stepper label="Límite inferior (a)" value={limiteA} onChange={v => { setLimiteA(v); reset(); }} />
                <Stepper label="Límite superior (b)" value={limiteB} onChange={v => { setLimiteB(v); reset(); }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Subintervalos (n)</span>
                  <span style={{ background: m.soft, color: m.accent, fontSize: 12, fontWeight: 900, padding: "3px 11px", borderRadius: 50, fontFamily: "monospace", border: `1px solid ${m.border}` }}>n = {nVal}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(248,250,252,0.9)", border: `1.5px solid ${metodo === "boole" ? "#e2e8f0" : m.border}`, borderRadius: 11, overflow: "hidden", height: 44 }}>
                  <button onClick={() => metodo !== "boole" && setNVal(clamp(nVal - getStep(), 2, 30))} disabled={metodo === "boole" || nVal <= 2}
                    style={{ width: 44, height: "100%", border: "none", background: "transparent", cursor: metodo === "boole" ? "not-allowed" : "pointer", fontSize: 20, color: metodo === "boole" ? "#e2e8f0" : m.accent, flexShrink: 0 }}>−</button>
                  <input type="number" value={nVal} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setNVal(clamp(v, 2, 30)); }} disabled={metodo === "boole"}
                    style={{ flex: 1, height: "100%", border: "none", background: "transparent", textAlign: "center", fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: metodo === "boole" ? "#e2e8f0" : "#0f172a", outline: "none" }} />
                  <button onClick={() => metodo !== "boole" && setNVal(clamp(nVal + getStep(), 2, 30))} disabled={metodo === "boole" || nVal >= 30}
                    style={{ width: 44, height: "100%", border: "none", background: "transparent", cursor: metodo === "boole" ? "not-allowed" : "pointer", fontSize: 20, color: metodo === "boole" ? "#e2e8f0" : m.accent, flexShrink: 0 }}>+</button>
                </div>
                <div style={{ marginTop: 9, position: "relative", height: 5, background: "#f1f5f9", borderRadius: 99 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((nVal - 2) / 28) * 100}%`, background: metodo === "boole" ? "#e2e8f0" : `linear-gradient(90deg, ${m.soft}, ${m.accent})`, borderRadius: 99, transition: "width 0.35s ease" }} />
                </div>
              </div>

              {error && <div style={{ marginBottom: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, padding: "9px 13px", color: "#991B1B", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={reset}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "rgba(248,250,252,0.9)", color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#94a3b8"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                  ↺ Resetear
                </button>
                <button onClick={calcular} disabled={loading}
                  style={{ flex: 2.2, padding: "11px", borderRadius: 10, border: "none", background: loading ? "#e2e8f0" : m.accent, color: loading ? "#94a3b8" : "white", fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 18px ${m.accent}44`, transition: "all 0.3s ease" }}>
                  {loading ? "⟳ Calculando..." : "∫ Calcular Integral"}
                </button>
              </div>
            </Card>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.13em", margin: "0 0 5px" }}>Fórmula Activa</p>
                  <h3 style={{ color: "#0f172a", fontSize: 15, fontWeight: 800, margin: 0 }}>{m.title} — {m.subtitle}</h3>
                </div>
                <div style={{ background: m.soft, border: `1.5px solid ${m.border}`, borderRadius: 9, padding: "5px 14px", color: m.accent, fontSize: 10, fontWeight: 800, fontFamily: "monospace", flexShrink: 0 }}>{m.restriccion}</div>
              </div>
              <div style={{ background: m.soft, border: `1px solid ${m.border}`, borderRadius: 11, padding: "14px 18px", textAlign: "center" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: m.text, letterSpacing: "0.04em", lineHeight: 1.85 }}>{m.formulaShort}</div>
              </div>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.65, margin: "10px 0 0" }}>{m.desc}</p>
            </Card>

            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.13em", margin: "0 0 4px" }}>Visualización Geométrica</p>
                  <h4 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "#475569", fontFamily: "monospace" }}>
                    <span style={{ color: m.accent }}>{funcion || "f(x)"}</span>
                    <span style={{ color: "#94a3b8" }}> ∈ [{limiteA}, {limiteB}]</span>
                  </h4>
                </div>
                {result !== null && (
                  <div style={{ background: m.soft, border: `1.5px solid ${m.border}`, borderRadius: 9, padding: "6px 13px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.accent, animation: "dotPulse 2s ease-in-out infinite" }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: m.accent, fontFamily: "monospace" }}>∫ ≈ {result?.toFixed(6)}</span>
                  </div>
                )}
              </div>
              <div style={{ background: "white", borderRadius: 12, padding: "12px 6px 6px", border: `1px solid ${m.border}`, boxShadow: `0 0 0 3px ${m.soft}` }}>
                <IntegralChart funcion={funcion} limiteA={limiteA} limiteB={limiteB} tabla={result !== null ? tabla : []} metodo={metodo} m={m} />
              </div>
              {result === null && <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>Calcula la integral para ver los nodos de integración sobre la curva.</p>}
            </Card>

            {result !== null && !loading && (
              <Card style={{ padding: 20, animation: "slideUp 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.13em", margin: "0 0 14px" }}>Resultados de la Integración</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
                  {[
                    { label: "Diferencial Δ", value: delta?.toFixed(6), big: false },
                    { label: "∫ Resultado", value: <CountUp value={result} decimals={8} />, big: true },
                    { label: "Σ Acumulada", value: sumatoria?.toFixed(8), big: false },
                    { label: "Subintervalos", value: tabla.length - 1, big: false },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background: kpi.big ? m.soft : "rgba(248,250,252,0.9)", borderRadius: 11, padding: kpi.big ? "14px 16px" : "11px 13px", border: `1px solid ${kpi.big ? m.border : "#f1f5f9"}` }}>
                      <span style={{ fontSize: 8, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>{kpi.label}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, color: kpi.big ? m.accent : "#475569", fontSize: kpi.big ? 16 : 12, display: "block" }}>{kpi.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ border: "1px solid #f1f5f9", borderRadius: 11, overflow: "hidden" }}>
                  <div style={{ background: m.soft, padding: "8px 14px", borderBottom: `1px solid ${m.border}`, display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1fr", gap: 6 }}>
                    {["Xᵢ", "Coef · f(xᵢ)", "f(xᵢ)", "Parcial"].map(h => <span key={h} style={{ fontSize: 8, fontWeight: 800, color: m.text, textTransform: "uppercase", letterSpacing: "0.11em" }}>{h}</span>)}
                  </div>
                  <div style={{ maxHeight: 190, overflowY: "auto" }}>
                    {tabla.map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1fr", gap: 6, padding: "7px 14px", background: idx % 2 === 0 ? "rgba(248,250,252,0.7)" : "rgba(255,255,255,0.8)", borderBottom: idx < tabla.length - 1 ? "1px solid #f8fafc" : "none" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#64748b" }}>{row.xi.toFixed(4)}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: m.accent, fontWeight: 600 }}>{row.coef} × f({row.xi.toFixed(3)})</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{row.fxi.toFixed(5)}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 800, color: "#059669" }}>{row.parcial.toFixed(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 10, background: m.soft, border: `1px solid ${m.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Σ Total f(xᵢ) · coef</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color: m.accent }}>{sumatoria?.toFixed(10)}</span>
                </div>
              </Card>
            )}

            {loading && (
              <Card style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ position: "relative", width: 52, height: 52 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2.5px solid ${m.border}`, borderTopColor: m.accent, animation: "spin 0.85s linear infinite" }} />
                  <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `1.5px solid ${m.soft}`, borderBottomColor: m.accent, animation: "spin 1.3s linear infinite reverse" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent, fontSize: 14, fontWeight: 900 }}>∫</div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: 0 }}>Procesando integral...</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── MARCO TEÓRICO ─── */}
      {tab === "teoria" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 60px", position: "relative", zIndex: 1 }}>
          <Card style={{ padding: "24px 28px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: m.soft, border: `1.5px solid ${m.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: m.accent, flexShrink: 0 }}>∫</div>
              <div>
                <h2 style={{ color: "#0f172a", fontSize: 19, fontWeight: 900, margin: "0 0 8px" }}>Newton-Cotes · Marco Conceptual</h2>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.75, margin: 0 }}>
                  Las fórmulas de Newton-Cotes aproximan integrales definidas reemplazando f(x) por un polinomio interpolador con incremento constante{" "}
                  <code style={{ fontFamily: "monospace", color: m.accent, background: m.soft, padding: "2px 8px", borderRadius: 6 }}>Δ = (b − a) / n</code>.
                </p>
              </div>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {Object.entries(METHODS).map(([key, md]) => (
              <Card key={key} style={{ padding: 22, gridColumn: key === "abierto" ? "1 / -1" : "auto", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${md.accent}18`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: md.soft, border: `1.5px solid ${md.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: md.accent }}>{md.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#0f172a" }}>{md.title}</h3>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{md.subtitle}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, margin: "0 0 12px" }}>{md.desc}</p>
                <div style={{ background: md.soft, borderRadius: 9, padding: "11px 14px", textAlign: "center", border: `1px solid ${md.border}` }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 12, color: md.text, lineHeight: 1.85 }}>{md.formulaShort}</div>
                </div>
                <div style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 5, background: md.soft, border: `1px solid ${md.border}`, borderRadius: 50, padding: "3px 12px" }}>
                  <span style={{ fontSize: 10, color: md.accent, fontWeight: 700 }}>⚡ {md.restriccion}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showTeam && <TeamModal onClose={() => setShowTeam(false)} m={m} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        @keyframes slideUp  { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        input::placeholder{color:#cbd5e1}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}
