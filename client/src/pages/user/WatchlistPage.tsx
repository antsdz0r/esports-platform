import { useNavigate } from "react-router-dom";
import { PgBtn } from "../../components/ui/UI";

export default function WatchlistPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
      <span style={{ fontSize: 52 }}>★</span>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: "var(--gold)" }}>Watchlist</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Ova stranica je u izradi. Uskoro dostupno.</p>
      <PgBtn variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>← Nazad</PgBtn>
    </div>
  );
}
