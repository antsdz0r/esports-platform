import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuthHook";
import type { IAuthAPIService } from "../../api_services/auth/IAuthAPIService";
import { PgBtn } from "../ui/UI";

export function RegisterForm({ authApi }: { authApi: IAuthAPIService }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", fullName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await authApi.register(form.username, form.email, form.password, form.fullName);
    setLoading(false);
    if (!res.success || !res.data) { setError(res.message ?? "Registracija neuspešna"); return; }
    login(res.data.token);
  };

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string }[] = [
    { key: "username", label: "Gamer Tag",  type: "text",     placeholder: "ProPlayer99" },
    { key: "fullName", label: "Pravo ime",  type: "text",     placeholder: "Marko Marković" },
    { key: "email",    label: "Email",       type: "email",    placeholder: "tvoj@email.com" },
    { key: "password", label: "Lozinka",     type: "password", placeholder: "Min 8 kar, 1 veliko, 1 broj" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ filter: "drop-shadow(0 0 14px var(--glow-violet))" }}>
            <polygon points="30,4 55,17 55,43 30,56 5,43 5,17" fill="none" stroke="var(--violet)" strokeWidth="1.6" />
            <polygon points="30,13 47,22 47,38 30,47 13,38 13,22" fill="rgba(124,92,255,0.1)" stroke="var(--cyan)" strokeWidth="1" />
            <circle cx="30" cy="30" r="5.5" fill="var(--violet)" />
          </svg>
        </div>
        <h1 className="pg-glitch" data-text="KREIRAJ NALOG"
          style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, letterSpacing: "0.06em", color: "var(--text)", marginBottom: 6 }}>KREIRAJ NALOG</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Pridruži se PulseGrid platformi</p>
      </div>

      {error && (
        <div style={{ marginBottom: 18, background: "rgba(255,45,126,0.1)", border: "1px solid rgba(255,45,126,0.35)", color: "#ff8fb4", fontSize: 13, padding: "12px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lblStyle}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={set(f.key)} required placeholder={f.placeholder} className="pg-input" />
          </div>
        ))}
        <div style={{ marginTop: 6 }}>
          <PgBtn type="submit" variant="primary" full disabled={loading}>
            {loading ? "Kreiranje..." : "Kreiraj nalog"}
          </PgBtn>
        </div>
      </form>

      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>
        Već imaš nalog?{" "}
        <a href="/login" style={{ color: "var(--violet2)", fontWeight: 600 }}>Prijavi se</a>
      </p>
    </div>
  );
}

const lblStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)",
};
