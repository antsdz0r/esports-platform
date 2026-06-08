import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import type { IAuthAPIService } from "../../api_services/auth/IAuthAPIService";
import { PgBtn } from "../ui/UI";

export function LoginForm({ authApi }: { authApi: IAuthAPIService }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await authApi.login(username, password);
    setLoading(false);
    if (!res.success || !res.data) { setError(res.message ?? "Pogrešni kredencijali"); return; }
    login(res.data.token);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Logo + heading */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 60, height: 60, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ filter: "drop-shadow(0 0 14px var(--glow-violet))" }}>
            <polygon points="30,4 55,17 55,43 30,56 5,43 5,17" fill="none" stroke="var(--violet)" strokeWidth="1.6" />
            <polygon points="30,13 47,22 47,38 30,47 13,38 13,22" fill="rgba(124,92,255,0.1)" stroke="var(--cyan)" strokeWidth="1" />
            <circle cx="30" cy="30" r="5.5" fill="var(--violet)" />
          </svg>
        </div>
        <h1 className="pg-glitch" data-text="DOBRODOŠAO"
          style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, letterSpacing: "0.08em", color: "var(--text)", marginBottom: 6 }}>DOBRODOŠAO</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Prijavi se u PulseGrid arenu</p>
      </div>

      {error && (
        <div style={{ marginBottom: 18, background: "rgba(255,45,126,0.1)", border: "1px solid rgba(255,45,126,0.35)", color: "#ff8fb4", fontSize: 13, padding: "12px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={lblStyle}>Korisničko ime</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="tvoj_username" className="pg-input" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={lblStyle}>Lozinka</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="pg-input" />
        </div>
        <div style={{ marginTop: 6 }}>
          <PgBtn type="submit" variant="primary" full disabled={loading}>
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </PgBtn>
        </div>
      </form>

      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>
        Nemaš nalog?{" "}
        <a href="/register" style={{ color: "var(--violet2)", fontWeight: 600 }}>Registruj se</a>
      </p>

      <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/guest/tournaments")}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer",
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
            border: "1px solid rgba(255,196,68,0.35)", background: "rgba(255,196,68,0.07)", color: "var(--gold)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,196,68,0.13)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,196,68,0.07)"; }}
        >
          👁 Nastavi kao gost
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", marginTop: 8, lineHeight: 1.4 }}>
          Pregled turnira i kataloga igara — bez registracije
        </p>
      </div>
    </div>
  );
}

const lblStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)",
};
