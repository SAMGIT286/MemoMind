import { useState, useEffect } from "react";
import {
  Bell,
  Download,
  HeartHandshake,
  Lock,
  Save,
  Shield,
  Trash2,
  UserRound,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import ProfilePhotoUpload from "../components/common/ProfilePhotoUpload";
import CaregiverSection from "../components/settings/CaregiverSection";
import PreferencesSection from "../components/settings/PreferencesSection";
import NotificationsPanel from "../components/notifications/NotificationsPanel";
import RoleBadge from "../components/common/RoleBadge";
import { calculateAge, validatePhone } from "../utils/validation";

export default function Settings() {
  const { user, updateUser, logout, role, language, setLanguage, t } = useAuth();
  const { medicines, appointments, memories, notifications, chat } = useApp();
  const [tab, setTab] = useState("Profile");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob || "",
    age: user?.age || (user?.dob ? calculateAge(user.dob) : ""),
    gender: user?.gender || "Male",
    location: user?.location || "",
    language: user?.language || language || "English",
    timezone: user?.timezone || "(UTC+05:30) India Standard Time",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        dob: user.dob || "",
        age: user.age || (user.dob ? calculateAge(user.dob) : ""),
        gender: user.gender || "Male",
        location: user.location || "",
        language: user.language || language || "English",
        timezone: user.timezone || "(UTC+05:30) India Standard Time",
      });
    }
  }, [user, language]);

  const tabs = [
    ["Profile", UserRound, t?.tabProfile || "Profile"],
    ["Caregiver", HeartHandshake, t?.tabCaregiver || "Caregiver"],
    ["Preferences", Shield, t?.tabPreferences || "Preferences"],
    ["Notifications", Bell, t?.tabNotifications || "Notifications"],
    ["Security", Lock, t?.tabSecurity || "Security & Data"],
  ];

  const handleDobChange = (e) => {
    const dobVal = e.target.value;
    const computed = calculateAge(dobVal);
    setForm((prev) => ({
      ...prev,
      dob: dobVal,
      age: computed,
    }));
    setError("");
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setForm((prev) => ({ ...prev, language: newLang }));
    setLanguage(newLang);
  };

  const handleProfileSave = (e) => {
    e?.preventDefault();
    setError("");

    // Exact 10-digit phone validation if entered
    if (form.phone.trim() && !validatePhone(form.phone)) {
      setError(t?.errPhoneExact10Digits || "Phone number must contain exactly 10 digits.");
      return;
    }

    updateUser({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
      age: form.age,
      gender: form.gender,
      location: form.location.trim(),
      language: form.language,
      timezone: form.timezone,
      preferences: {
        ...(user?.preferences || {}),
        language: form.language,
      },
    });

    if (form.language !== language) {
      setLanguage(form.language);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportData = () => {
    const data = {
      user,
      medicines,
      appointments,
      memories,
      notifications,
      chat,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memomind-data-${user?.id || "user"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        t?.deleteAccountConfirm || "Are you sure you want to permanently delete your account and all stored records? This cannot be undone."
      )
    ) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("memomind_"))
        .forEach((k) => localStorage.removeItem(k));
      logout();
    }
  };

  return (
    <div className="page">
      <div className="page-heading-row">
        <div className="page-heading">
          <div className="eyebrow">{t?.navSettings || "ACCOUNT & SETTINGS"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.navSettings || "Settings"}</h1>
            <RoleBadge role={role} />
          </div>
          <p>{t?.profileSub || "Manage your profile details, caregiver connection, app preferences, and data privacy."}</p>
        </div>

        {tab === "Profile" && (
          <button className="btn btn-primary" onClick={handleProfileSave}>
            <Save size={16} /> {saved ? (t?.saveChanges ? `${t.saveChanges} ✓` : "Saved!") : (t?.saveChanges || "Save Changes")}
          </button>
        )}
      </div>

      <div className="settings-layout">
        <div className="settings-nav">
          {tabs.map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="panel settings-panel">
          {tab === "Profile" && (
            <>
              <div className="settings-section-title">
                <h2>{t?.profileTitle || "Personal Profile & Contact Details"}</h2>
                <p>{t?.profileSub || "Update your personal information, preferred language and profile picture."}</p>
              </div>

              {error && (
                <div className="error-note" style={{ marginBottom: "14px" }}>
                  <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="profile-settings-head">
                <ProfilePhotoUpload
                  photoUrl={user?.photoUrl}
                  userName={form.name || user?.name || "User"}
                  size="xl"
                  autoSave={true}
                />
              </div>

              <form onSubmit={handleProfileSave} className="stack-form">
                <div className="form-grid">
                  <label className="form-field">
                    <span className="field-label">{t?.fullName || "Full Name"}</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t?.fullNamePlaceholder || "Your full name"}
                    />
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.email || "Email Address"}</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t?.emailPlaceholder || "you@example.com"}
                    />
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.phone || "Phone Number"}</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder={t?.phonePlaceholder || "98765 43210"}
                    />
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.dob || "Date of Birth"}</span>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={handleDobChange}
                    />
                  </label>

                  <label className="form-field">
                    <span className="field-label">
                      {t?.age || "Age"} <em style={{ fontSize: "9px" }}>({t?.ageCalculatedHint || "Auto-calculated"})</em>
                    </span>
                    <input
                      type="number"
                      value={form.age}
                      readOnly
                      disabled
                      style={{ background: "#f3f6f4", cursor: "not-allowed", color: "#374151" }}
                    />
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.gender || "Gender"}</span>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="Male">{t?.genderMale || "Male"}</option>
                      <option value="Female">{t?.genderFemale || "Female"}</option>
                      <option value="Other">{t?.genderOther || "Other"}</option>
                      <option value="Prefer not to say">{t?.genderPreferNot || "Prefer not to say"}</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.preferredLanguage || "Preferred Language"}</span>
                    <select
                      value={form.language}
                      onChange={handleLanguageChange}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">हिंदी (Hindi)</option>
                      <option value="Marathi">मराठी (Marathi)</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span className="field-label">{t?.location || "Location / City"}</span>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder={t?.locationPlaceholder || "e.g. Bandra, Mumbai"}
                    />
                  </label>

                  <label className="form-field full">
                    <span className="field-label">{t?.timeZone || "Time Zone"}</span>
                    <select
                      value={form.timezone}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    >
                      <option>(UTC+05:30) India Standard Time</option>
                      <option>(UTC+00:00) UTC</option>
                      <option>(UTC-05:00) Eastern Time (US & Canada)</option>
                      <option>(UTC-08:00) Pacific Time (US & Canada)</option>
                    </select>
                  </label>
                </div>

                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    <Save size={15} /> {saved ? (t?.saveChanges ? `${t.saveChanges} ✓` : "Saved!") : (t?.saveChanges || "Save Profile")}
                  </button>
                </div>
              </form>
            </>
          )}

          {tab === "Caregiver" && <CaregiverSection />}

          {tab === "Preferences" && <PreferencesSection />}

          {tab === "Notifications" && (
            <div>
              <div className="settings-section-title">
                <h2>{t?.tabNotifications || "Notifications Log"}</h2>
                <p>{t?.notificationsSub || "View and manage all notifications received on your account."}</p>
              </div>
              <NotificationsPanel />
            </div>
          )}

          {tab === "Security" && (
            <>
              <div className="settings-section-title">
                <h2>{t?.tabSecurity || "Security & Data Privacy"}</h2>
                <p>{t?.exportDataDesc || "Export your personal memory journal or manage your local session."}</p>
              </div>

              <div className="security-actions">
                <button className="settings-action" onClick={handleExportData}>
                  <Download size={17} />
                  <span>
                    <strong>{t?.downloadJsonBtn || "Download My Data (JSON)"}</strong>
                    <small>{t?.exportDataDesc || "Export all medicines, appointments, memories and chat logs."}</small>
                  </span>
                  <b>→</b>
                </button>

                <button className="settings-action danger" onClick={handleDeleteAccount}>
                  <Trash2 size={17} />
                  <span>
                    <strong>{t?.deleteAccountBtn || "Reset Account / Clear Local Storage"}</strong>
                    <small>{t?.deleteAccountConfirm || "Permanently reset this session and clear stored records."}</small>
                  </span>
                  <b>→</b>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
