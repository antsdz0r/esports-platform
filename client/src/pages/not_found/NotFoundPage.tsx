import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimatedBackground } from "../../components/ui/AnimatedBackground";
import { PgBtn } from "../../components/ui/UI";

export default function NotFoundPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <AnimatedBackground particles={18} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ textAlign: "center", position: "relative", zIndex: 3 }}>
        <p className="pg-glitch" data-text="404"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(90px,16vw,180px)", fontWeight: 900, color: "rgba(124,92,255,0.12)", lineHeight: 1, marginBottom: 8 }}>404</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12, letterSpacing: "0.1em" }}>PAGE NOT FOUND</p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28 }}>This page doesn&apos;t exist or has been moved to another arena.</p>
        <Link to="/login"><PgBtn variant="primary">← Back to login</PgBtn></Link>
      </motion.div>
    </main>
  );
}
