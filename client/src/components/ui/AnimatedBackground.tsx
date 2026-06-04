import { useState } from "react";

interface Dot { left: string; top: string; delay: string; duration: string; color: string; size: number; }


function makeDots(count: number): Dot[] {
  return Array.from({ length: count }).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${60 + Math.random() * 40}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 8}s`,
    color: i % 3 === 0 ? "var(--cyan)" : i % 3 === 1 ? "var(--violet)" : "var(--pink)",
    size: 2 + Math.random() * 8,
  }));
}


export function AnimatedBackground({ particles = 18 }: { particles?: number }) {
  const [dots] = useState<Dot[]>(() => makeDots(particles));

  return (
    <div className="pg-bg" aria-hidden>
      <div className="pg-bg__mesh pg-bg__mesh--1" />
      <div className="pg-bg__mesh pg-bg__mesh--2" />
      <div className="pg-bg__mesh pg-bg__mesh--3" />
      <div className="pg-bg__grid" />
      <div className="pg-bg__scan" />
      {dots.map((d, i) => (
        <span
          key={i}
          className="pg-particle"
          style={{
            left: d.left,
            top: d.top,
            animationDelay: d.delay,
            animationDuration: d.duration,
            background: d.color,
            boxShadow: `0 0 6px ${d.color}`,
            width: d.size,
            height: d.size,
          }}
        />
      ))}
    </div>
  );
}
