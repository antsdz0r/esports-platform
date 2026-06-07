import { type ReactNode, type CSSProperties, type ElementType } from "react";

/**
 * VHS / CRT glitch hover efekat (reusable).
 * Sav efekat je u CSS klasi `.vhs-glitch` (vidi index.css) — bez biblioteka.
 * Primeni na kartice, dugmad ili slike tako sto ih obavijes ovom komponentom:
 *
 *   <VhsGlitch style={{ borderRadius: 14 }}><MojaKartica /></VhsGlitch>
 *   <VhsGlitch as="span"><button>Dugme</button></VhsGlitch>
 *   <VhsGlitch style={{ borderRadius: 12, display: "inline-block" }}><img src="..." /></VhsGlitch>
 */
interface VhsGlitchProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
}

export function VhsGlitch({ children, className = "", style, as }: VhsGlitchProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`vhs-glitch ${className}`.trim()} style={style}>
      {children}
    </Tag>
  );
}
