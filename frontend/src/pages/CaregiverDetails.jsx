import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { validatePhone, validateEmail } from "../utils/validation";
import { AlertCircle } from "lucide-react";

export default function CaregiverDetails() {
  const { user, updateUser, t } = useAuth();

  const [form, setForm] = useState({
    name: user?.caregiver?.name || "",
    relationship: user?.caregiver?.relationship || "Daughter-in-law",
    phone: user?.caregiver?.phone || "",
    email: user?.caregiver?.email || "",
  });

  const [permissions, setPermissions] = useState(
    user?.caregiver?.permissions || {
      medicine: true,
      appointments: true,
      timeline: true,
      alerts: true,
    }
  );

  const [error, setError] = useState("");

  const toggle = (key) => setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const handleNext = () => {
    setError("");

    // If caregiver name is provided, validate phone and email
    if (form.name.trim()) {
      if (form.phone.trim() && !validatePhone(form.phone)) {
        setError(t?.errCaregiverPhoneMinDigits || "Caregiver phone number must contain exactly 10 digits.");
        return false;
      }
      if (form.email.trim() && !validateEmail(form.email)) {
        setError(t?.errEmailRequired || "Please enter a valid email address.");
        return false;
      }

      updateUser({
        caregiver: {
          name: form.name.trim(),
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim(),
          permissions,
        },
      });
    } else {
      // Caregiver is optional - do not create fake records
      updateUser({ caregiver: null });
    }

    return true;
  };

  return (
    <OnboardingLayout
      step={4}
      title={t?.caregiverTitle || "Caregiver Information"}
      subtitle={t?.caregiverSubtitle || "You can add a caregiver now or later."}
      backTo="/onboarding/emergency-contacts"
      nextTo="/onboarding/additional-details"
      nextAction={handleNext}
    >
      {error && (
        <div className="error-note" style={{ marginBottom: "16px" }}>
          <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          <span>{error}</span>
        </div>
      )}

      <div className="form-grid">
        <label className="form-field">
          <span className="field-label">{t?.caregiverName || "Name"}</span>
          <input
            placeholder={t?.caregiverNamePlaceholder || "Enter caregiver name (optional)"}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setError("");
            }}
          />
        </label>

        <label className="form-field">
          <span className="field-label">{t?.relationship || "Relationship"}</span>
          <select
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          >
            <option value="Daughter-in-law">{t?.relDaughterInLaw || "Daughter-in-law"}</option>
            <option value="Daughter">{t?.relDaughter || "Daughter"}</option>
            <option value="Son">{t?.relSon || "Son"}</option>
            <option value="Son-in-law">{t?.relSonInLaw || "Son-in-law"}</option>
            <option value="Spouse">{t?.relSpouse || "Spouse"}</option>
            <option value="Sibling">{t?.relSibling || "Sibling"}</option>
            <option value="Professional Caregiver / Nurse">{t?.relNurse || "Professional Caregiver / Nurse"}</option>
            <option value="Health Partner / Friend">{t?.relHealthPartner || "Health Partner / Friend"}</option>
          </select>
        </label>

        <label className="form-field">
          <span className="field-label">{t?.caregiverPhone || "Phone Number"}</span>
          <input
            placeholder={t?.caregiverPhonePlaceholder || "10-digit phone number"}
            value={form.phone}
            onChange={(e) => {
              setForm({ ...form, phone: e.target.value });
              setError("");
            }}
          />
        </label>

        <label className="form-field">
          <span className="field-label">{t?.caregiverEmail || "Email"}</span>
          <input
            type="email"
            placeholder={t?.caregiverEmailPlaceholder || "caregiver@example.com"}
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setError("");
            }}
          />
        </label>
      </div>

      <div className="section-box mt-20">
        <div className="section-box-title">
          {t?.accessPermissions || "Access Permissions"}
        </div>
        <div className="permission-list">
          {[
            ["medicine", t?.permMedicine || "View medicine status"],
            ["appointments", t?.permAppointments || "View appointments"],
            ["timeline", t?.permTimeline || "View daily timeline"],
            ["alerts", t?.permAlerts || "Receive alerts and notifications"],
          ].map(([key, label]) => (
            <label className="check-row" key={key}>
              <input
                type="checkbox"
                checked={!!permissions[key]}
                onChange={() => toggle(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </OnboardingLayout>
  );
}
