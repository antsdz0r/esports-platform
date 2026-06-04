import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const LERP = 0.14;
const RING_SIZE = 36;

function isEnabled() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover), (pointer: fine)").matches;
}



export function TracingCursor() {
  const enabled = useState(isEnabled)[0];
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, ringX: 0, ringY: 0 });
  const raf = useRef(0);
  const visibleRef = useRef(false);

  const [visible, setVisible] = useState(false);
  const [overInteractive, setOverInteractive] = useState(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const { x, y, ringX, ringY } = pos.current;
      pos.current.ringX = ringX + (x - ringX) * LERP;
      pos.current.ringY = ringY + (y - ringY) * LERP;

      const ring = ringRef.current;
      if (ring) {
        ring.style.transform = `translate3d(${pos.current.ringX}px, ${pos.current.ringY}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        pos.current.ringX = e.clientX;
        pos.current.ringY = e.clientY;
        setVisible(true);
      }
      const t = e.target as HTMLElement;
      setOverInteractive(!!t.closest("a, button, [role='button'], input, select, textarea, label, .pg-btn"));
    };

    const onLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };

    const onDown = () => setPressing(true);
    const onUp = () => setPressing(false);

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ringClass = [
    "pg-cursor__ring",
    visible ? "pg-cursor__ring--visible" : "",
    overInteractive && !pressing ? "pg-cursor__ring--hover" : "",
    pressing ? "pg-cursor__ring--down" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="pg-cursor" aria-hidden>
      <div ref={ringRef} className={ringClass} style={{ width: RING_SIZE, height: RING_SIZE }} />
    </div>,
    document.body,
  );
}
