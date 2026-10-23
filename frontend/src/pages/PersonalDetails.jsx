import { useState, useEffect } from "react";
import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import ProfilePhotoUpload from "../components/common/ProfilePhotoUpload";
import { useAuth } from "../context/AuthContext";
import { calculateAge, validateAgeByRole, validatePhone, validateEmail } from "../utils/validation";
import { AlertCircle } from "lucide-react";

export default function PersonalDetails() {
  const { user, updateUser, role, language, setLanguage, t } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    dob: user?.dob || "",
    age: user?.age || (user?.dob ? calculateAge(user.dob) : ""),
    gender: user?.gender || "Male",
    email: user?.email || "",
    phone: user?.phone || "",
    language: user?.language || language || "English",
    timezone: user?.timezone || "(UTC+05:30) India Standard Time",
    location: user?.location || "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        dob: user.dob || prev.dob,
        age: user.age || (user.dob ? calculateAge(user.dob) : prev.age),
        gender: user.gender || prev.gender,
        location: user.location || prev.location,
        language: user.language || prev.language,
        timezone: user.timezone || prev.timezone,
      }));
    }
  }, [user]);

  const handleDobChange = (e) => {
    const dobValue = e.target.value;
    const computedAge = calculateAge(dobValue);
    setForm((prev) => ({
      ...prev,
      dob: dobValue,
      age: computedAge,
    }));
    setError("");
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setForm((prev) => ({ ...prev, language: newLang }));
    setLanguage(newLang);
  };

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  };

  const handleNextAction = () => {
    setError("");

    // 1. Name validation
    if (!form.name.trim()) {
      setError(t?.errNameRequired || "Please enter your full name.");
      return false;
    }

    // 2. DOB validation
    if (!form.dob) {
      setError(t?.errDobRequired || "Please select your date of birth.");
      return false;
    }

    // 3. Age validation by role (Elderly >= 56, Caregiver >= 23, Emergency Contact >= 21)
    const ageResult = validateAgeByRole(form.age, role);
    if (!ageResult.valid) {
      setError(t?.[ageResult.errorKey] || "Age does not meet role requirements.");
      return false;
    }

    // 4. Email validation
    if (!validateEmail(form.email)) {
      setError(t?.errEmailRequired || "Please enter a valid email address.");
      return false;
    }

    // 5. Phone validation (exactly 10 digits)
    if (!validatePhone(form.phone)) {
      setError(t?.errPhoneExact10Digits || "Phone number must contain exactly 10 digits.");
      return false;
    }

    // Save details to user state & persistent storage
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

    return true;
  };

  return (
    <OnboardingLayout
      step={2}
      title={t?.personalTitle || "Personal Information"}
      subtitle={t?.personalSubtitle || "Let's start with some basic details."}
      backTo="/onboarding/user-type"
      nextTo="/onboarding/emergency-contacts"
      nextAction={handleNextAction}
    >
      <div className="profile-upload-row">
        <ProfilePhotoUpload
          photoUrl={user?.photoUrl}
          userName={form.name || "User"}
          size="xl"
          autoSave={true}
        />
      </div>

      {error && (
        <div className="error-note" style={{ marginBottom: "16px" }}>
          <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          <span>{error}</span>
        </div>
      )}

      <div className="form-grid">
        <label className="form-field full">
          <span className="field-label">{t?.fullName || "Full Name"} *</span>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={t?.fullNamePlaceholder || "Enter your full name"}
            required
          />
        </label>

        <label className="form-field">
          <span className="field-label">{t?.dob || "Date of Birth"} *</span>
          <input
            type="date"
            value={form.dob}
            onChange={handleDobChange}
            required
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
            placeholder={t?.age || "Age"}
          />
        </label>

        <label className="form-field">
          <span className="field-label">{t?.gender || "Gender"}</span>
          <select
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
          >
            <option value="Male">{t?.genderMale || "Male"}</option>
            <option value="Female">{t?.genderFemale || "Female"}</option>
            <option value="Other">{t?.genderOther || "Other"}</option>
            <option value="Prefer not to say">{t?.genderPreferNot || "Prefer not to say"}</option>
          </select>
        </label>

        <label className="form-field">
          <span className="field-label">{t?.email || "Email"} *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder={t?.emailPlaceholder || "Enter your email"}
            required
          />
        </label>

        <label className="form-field">
          <span className="field-label">{t?.phone || "Phone Number"} *</span>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder={t?.phonePlaceholder || "98765 43210"}
            required
          />
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
          <span className="field-label">{t?.timeZoneOptional || "Time Zone (optional)"}</span>
          <select
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          >
            <option>(UTC+05:30) India Standard Time</option>
            <option>(UTC+00:00) UTC</option>
            <option>(UTC-05:00) Eastern Time</option>
            <option>(UTC-08:00) Pacific Time</option>
          </select>
        </label>

        <label className="form-field full">
          <span className="field-label">{t?.location || "Location"}</span>
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder={t?.locationPlaceholder || "Enter your location (e.g. Mumbai, Maharashtra)"}
          />
        </label>
      </div>
    </OnboardingLayout>
  );
}
