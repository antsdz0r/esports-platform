import { useEffect, useRef } from "react";

const COLORS = ["#00e5ff", "#7c5cff", "#9d7bff", "#ff2d7e"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  fadeIn: number;
}

function spawn(w: number, h: number, from: "bottom" | "top" | "side" = "bottom"): Particle {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  if (from === "bottom") {
    return {
      x: Math.random() * w,
      y: h + 8 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -0.35 - Math.random() * 1.4,
      size: 1.5 + Math.random() * 3.5,
      color,
      alpha: 0,
      fadeIn: 0.025 + Math.random() * 0.02,
    };
  }
  if (from === "top") {
    return {
      x: Math.random() * w,
      y: -8 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0.25 + Math.random() * 0.9,
      size: 1 + Math.random() * 2.5,
      color,
      alpha: 0,
      fadeIn: 0.02 + Math.random() * 0.015,
    };
  }
  const fromLeft = Math.random() > 0.5;
  return {
    x: fromLeft ? -10 : w + 10,
    y: Math.random() * h,
    vx: fromLeft ? 0.3 + Math.random() * 0.8 : -0.3 - Math.random() * 0.8,
    vy: (Math.random() - 0.5) * 0.6,
    size: 1 + Math.random() * 2.5,
    color,
    alpha: 0,
    fadeIn: 0.02 + Math.random() * 0.015,
  };
}

function isOut(p: Particle, w: number, h: number) {
  return p.x < -30 || p.x > w + 30 || p.y < -40 || p.y > h + 40 || p.alpha <= 0.01;
}

/**
 * AnimatedBackground — mesh + grid + žive tačkice (spawn, kretanje, respawn).
 */
export function AnimatedBackground({ particles = 36 }: { particles?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(0);
  const spawnTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetCount = reduced ? Math.min(8, particles) : particles;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    poolRef.current = Array.from({ length: targetCount }, () =>
      spawn(sizeRef.current.w, sizeRef.current.h, Math.random() > 0.85 ? "side" : "bottom"),
    );

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const pool = poolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.alpha = Math.min(0.9, p.alpha + p.fadeIn);

        if (isOut(p, w, h)) {
          const edge = Math.random();
          const from = edge > 0.72 ? "side" : edge > 0.12 ? "bottom" : "top";
          pool[i] = spawn(w, h, from);
        }

        drawParticle(p);
      }

      if (!reduced && now - spawnTimerRef.current > 280) {
        spawnTimerRef.current = now;
        if (pool.length < targetCount + 6) {
          pool.push(spawn(w, h, Math.random() > 0.5 ? "bottom" : "side"));
        }
        while (pool.length > targetCount + 10) pool.shift();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [particles]);

  return (
    <div className="pg-bg" aria-hidden>
      <div className="pg-bg__mesh pg-bg__mesh--1" />
      <div className="pg-bg__mesh pg-bg__mesh--2" />
      <div className="pg-bg__mesh pg-bg__mesh--3" />
      <div className="pg-bg__grid" />
      <div className="pg-bg__scan" />
      <canvas ref={canvasRef} className="pg-bg__particles" />
    </div>
  );
}
