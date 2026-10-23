import { useState } from "react";
import { Leaf, UserRound, BriefcaseBusiness, HeartHandshake, ShieldAlert, ArrowRight, AlertCircle, Languages } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, t, language, setLanguage } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("elderly");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  const roles = [
    { id: "elderly", title: t?.roleElderly || "Elderly Person", icon: UserRound },
    { id: "young_professional", title: t?.roleYp || "Young Professional", icon: BriefcaseBusiness },
    { id: "caregiver", title: t?.roleCaregiver || "Caregiver", icon: HeartHandshake },
    { id: "emergency_contact", title: t?.roleEmergency || "Emergency Contact", icon: ShieldAlert },
  ];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t?.errNameRequired || "Please enter your name.");
    if (!form.email.trim()) return setError(t?.errEmailRequired || "Please enter a valid email address.");
    if (form.password.length < 6) return setError(t?.errPasswordMinLength || "Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError(t?.errPasswordMismatch || "Passwords do not match.");

    const res = await register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: role,
      userType: role,
      language: language,
    });

    if (!res || !res.success) {
      return setError(res?.error || t?.errAccountExists || "Registration failed.");
    }

    navigate("/onboarding/personal-details", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-quote">
          <span>✦</span>
          <h2>{t?.registerQuoteTitle || "Build your personal memory space."}</h2>
          <p>{t?.registerQuoteText || "Set up reminders, memories, trusted contacts, and your AI assistant all in one place."}</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card" style={{ width: "min(460px, 100%)" }}>
          <div className="logo-center">
            <div className="logo-circle">
              <Leaf size={28} />
            </div>
            <h1>{t?.createAccountTitle || "Create your account"}</h1>
            <p>{t?.createAccountSub || "Select your account type and start your setup."}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", alignItems: "center", gap: "6px" }}>
            <Languages size={14} style={{ color: "var(--muted)" }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: "auto", padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
              aria-label="Select Language"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Marathi">मराठी (Marathi)</option>
              <option value="Spanish">Español (Spanish)</option>
              <option value="French">Français (French)</option>
              <option value="Bengali">বাংলা (Bengali)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="Telugu">తెలుగు (Telugu)</option>
              <option value="Arabic">العربية (Arabic)</option>
            </select>
          </div>

          <div className="field-label" style={{ marginBottom: "8px" }}>
            {t?.signingUpAsLabel || "I am signing up as:"}
          </div>
          <div className="login-role-grid" style={{ marginBottom: "14px" }}>
            {roles.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`login-role-chip ${role === id ? "selected" : ""}`}
                onClick={() => setRole(id)}
              >
                <Icon size={14} />
                <span>{title}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="stack-form">
            <label className="form-field">
              <span className="field-label">{t?.fullNameLabel || "Full name"}</span>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setError("");
                }}
                placeholder={t?.fullNamePlaceholder || "Your full name"}
                required
              />
            </label>

            <label className="form-field">
              <span className="field-label">{t?.emailLabel || "Email address"}</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setError("");
                }}
                placeholder="you@example.com"
                required
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span className="field-label">{t?.passwordLabel || "Password"}</span>
                <input
                  type="password"
                  minLength="6"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    setError("");
                  }}
                  placeholder="Min. 6 chars"
                  required
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.confirmPasswordLabel || "Confirm Password"}</span>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => {
                    setForm({ ...form, confirm: e.target.value });
                    setError("");
                  }}
                  placeholder="Re-type password"
                  required
                />
              </label>
            </div>

            {error && (
              <div className="error-note">
                <AlertCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit">
              <span>{t?.createAccountBtn || "Create account & start setup"}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="auth-footer">
            {t?.alreadyHaveAccountPrompt || "Already have an account?"}{" "}
            <Link to="/login">{t?.signInLink || "Sign in"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
