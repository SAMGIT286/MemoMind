import { useState } from "react";
import { Bell, Volume2, Mic, Sparkles, ShieldAlert, Check, Moon, Sun, Type } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function PreferencesSection() {
  const { user, updateUser, t } = useAuth();
  const [success, setSuccess] = useState("");

  const currentPrefs = user?.preferences || {
    notifications: true,
    medicineReminders: true,
    appointmentReminders: true,
    dailySummary: true,
    voiceAssistant: true,
    voiceAutoSpeak: true,
    memoryTracking: true,
    emergencyAlerts: true,
    fontSize: "normal",
    theme: "light",
  };

  const handleToggle = (key) => {
    const updated = {
      ...currentPrefs,
      [key]: !currentPrefs[key],
    };
    updateUser({ preferences: updated });
    setSuccess(t?.savedSuccessMsg || "Preference saved.");
    setTimeout(() => setSuccess(""), 2000);
  };

  const handleSelectChange = (key, value) => {
    const updated = {
      ...currentPrefs,
      [key]: value,
    };
    updateUser({ preferences: updated });
    setSuccess(t?.savedSuccessMsg || "Setting updated.");
    setTimeout(() => setSuccess(""), 2000);
  };

  const preferenceItems = [
    {
      key: "notifications",
      title: t?.prefMasterNotifsTitle || "Master Notifications",
      description: t?.prefMasterNotifsDesc || "Allow MemoMind to display alerts and reminder banners.",
      icon: Bell,
    },
    {
      key: "medicineReminders",
      title: t?.prefMedicineNotifsTitle || "Medication Reminders",
      description: t?.prefMedicineNotifsDesc || "Receive timely audio and visual prompts when it is time to take medicines.",
      icon: Bell,
    },
    {
      key: "appointmentReminders",
      title: t?.prefAppointmentNotifsTitle || "Doctor & Schedule Reminders",
      description: t?.prefAppointmentNotifsDesc || "Notify before upcoming doctor visits and scheduled activities.",
      icon: Bell,
    },
    {
      key: "dailySummary",
      title: t?.prefDailySummaryTitle || "Daily Morning Briefing",
      description: t?.prefDailySummaryDesc || "Display today's schedule and tasks prominently on the dashboard.",
      icon: Sparkles,
    },
    {
      key: "voiceAssistant",
      title: t?.prefVoiceAssistantTitle || "Voice Assistant Dictation",
      description: t?.prefVoiceAssistantDesc || "Enable speech-to-text mic for speaking directly to the AI Assistant.",
      icon: Mic,
    },
    {
      key: "voiceAutoSpeak",
      title: t?.prefVoiceAutoSpeakTitle || "Read AI Responses Aloud",
      description: t?.prefVoiceAutoSpeakDesc || "Automatically speak the AI Assistant's answer using text-to-speech.",
      icon: Volume2,
    },
    {
      key: "memoryTracking",
      title: t?.prefMemoryTrackingTitle || "Automatic Memory Journaling",
      description: t?.prefMemoryTrackingDesc || "Record medication events and check-ins onto your daily memory timeline.",
      icon: Sparkles,
    },
    {
      key: "emergencyAlerts",
      title: t?.prefEmergencyAlertsTitle || "Emergency Alert Broadcasting",
      description: t?.prefEmergencyAlertsDesc || "Instantly notify emergency contacts if an SOS or missed health event is triggered.",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="preferences-section-container">
      <div className="settings-section-title">
        <h2>{t?.appPreferencesTitle || "App Preferences & Accessibility"}</h2>
        <p>{t?.appPreferencesSub || "Personalize how MemoMind reminds, speaks, and assists you. All changes are saved automatically."}</p>
      </div>

      {success && (
        <div className="photo-upload-message success" style={{ marginBottom: "15px" }}>
          <Check size={14} />
          <span>{success}</span>
        </div>
      )}

      <div className="toggle-list">
        {preferenceItems.map(({ key, title, description, icon: Icon }) => {
          const isChecked = !!currentPrefs[key];
          return (
            <div className="toggle-row" key={key}>
              <div className="toggle-copy">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon size={14} style={{ color: "var(--green-700)" }} />
                  <strong>{title}</strong>
                </div>
                <span>{description}</span>
              </div>
              <button
                type="button"
                className={`toggle ${isChecked ? "on" : ""}`}
                onClick={() => handleToggle(key)}
                aria-pressed={isChecked}
                title={`Toggle ${title}`}
              >
                <i />
              </button>
            </div>
          );
        })}
      </div>

      <div className="accessibility-box mt-20">
        <h3>{t?.tabPreferences || "Display & Readability Options"}</h3>
        <div className="form-grid" style={{ marginTop: "12px" }}>
          <label className="form-field">
            <span className="field-label">Font Size</span>
            <select
              value={currentPrefs.fontSize || "normal"}
              onChange={(e) => handleSelectChange("fontSize", e.target.value)}
            >
              <option value="normal">Standard</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </label>

          <label className="form-field">
            <span className="field-label">Theme Mode</span>
            <select
              value={currentPrefs.theme || "light"}
              onChange={(e) => handleSelectChange("theme", e.target.value)}
            >
              <option value="light">Fresh Emerald</option>
              <option value="contrast">High Contrast</option>
              <option value="soft">Soft Warm</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
