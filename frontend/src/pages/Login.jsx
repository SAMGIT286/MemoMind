import { useState } from "react";
import {
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  UserRound,
  BriefcaseBusiness,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Languages,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, t, language, setLanguage } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("elderly");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const rolesList = [
    {
      id: "elderly",
      title: t?.roleElderly || "Elderly Person",
      subtitle: t?.roleElderlySub || "Personalized memory assistant & reminders",
      icon: UserRound,
    },
    {
      id: "young_professional",
      title: t?.roleYp || "Young Professional",
      subtitle: t?.roleYpSub || "Daily organization, routine & wellness",
      icon: BriefcaseBusiness,
    },
    {
      id: "caregiver",
      title: t?.roleCaregiver || "Caregiver",
      subtitle: t?.roleCaregiverSub || "Monitor & support patient health",
      icon: HeartHandshake,
    },
    {
      id: "emergency_contact",
      title: t?.roleEmergency || "Emergency Contact",
      subtitle: t?.roleEmergencySub || "Read-only patient timeline & alerts",
      icon: ShieldAlert,
    },
  ];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      return setError(t?.errEnterBothCredentials || "Please enter both email and password.");
    }

    const res = await login(form.email, form.password, selectedRole);
    if (!res || !res.success) {
      return setError(res?.error || t?.errInvalidPassword || "Login failed. Please check your email and password.");
    }

    const authenticatedUser = res.user;
    if (authenticatedUser?.role === "caregiver" || selectedRole === "caregiver") {
      navigate("/caregiver", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const currentRoleTitle = rolesList.find((r) => r.id === selectedRole)?.title || t?.roleElderly || "Elderly Person";

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-leaf auth-leaf-1">✦</div>
        <div className="auth-leaf auth-leaf-2">✦</div>
        <div className="auth-quote">
          <span>“</span>
          <h2>{t?.loginQuoteTitle || "Remember the moments that matter."}</h2>
          <p>
            {t?.loginQuoteText || "A personal memory, daily routine, and health care companion tailored for seniors, young professionals, caregivers, and family emergency contacts."}
          </p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card" style={{ width: "min(460px, 100%)" }}>
          <div className="logo-center">
            <div className="logo-circle">
              <Leaf size={28} />
            </div>
            <h1>{t?.appName || "MemoMind"}</h1>
            <p>{t?.signInSubtitle || "Select your role to sign in to your account"}</p>
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

          <div className="login-role-selector-section">
            <div className="field-label" style={{ marginBottom: "8px" }}>
              {t?.selectRoleLabel || "Select Login Role:"}
            </div>
            <div className="login-role-grid">
              {rolesList.map(({ id, title, icon: Icon }) => {
                const isSelected = selectedRole === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`login-role-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleRoleChange(id)}
                  >
                    <Icon size={15} />
                    <span>{title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={submit} className="stack-form" style={{ marginTop: "14px" }}>
            <label className="form-field">
              <span className="field-label">{t?.emailLabel || "Email address"}</span>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setError("");
                  }}
                  required
                />
              </div>
            </label>

            <label className="form-field">
              <span className="field-label">{t?.passwordLabel || "Password"}</span>
              <div className="input-with-icon">
                <LockKeyhole size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="error-note">
                <AlertCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit" style={{ marginTop: "4px" }}>
              <span>{t?.signInBtn || "Sign In"} ({currentRoleTitle})</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="auth-footer">
            {t?.dontHaveAccountPrompt || "Don't have an account?"}{" "}
            <Link to="/register">{t?.createOneNowLink || "Create new account"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
