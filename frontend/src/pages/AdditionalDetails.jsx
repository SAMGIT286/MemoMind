import { Activity, BedDouble, Coffee, Dumbbell, Moon, Utensils, AlertCircle } from "lucide-react";
import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { validatePhone } from "../utils/validation";

export default function AdditionalDetails() {
  const navigate = useNavigate();
  const { user, updateUser, role, t } = useAuth();

  const [form, setForm] = useState({
    doctor: user?.doctor?.name || "",
    specialization: user?.doctor?.specialization || "",
    hospital: user?.doctor?.hospital || "",
    phone: user?.doctor?.phone || "",
    wake: user?.routine?.wake || "",
    sleep: user?.routine?.sleep || "",
    breakfast: user?.routine?.breakfast || "",
    lunch: user?.routine?.lunch || "",
    dinner: user?.routine?.dinner || "",
    exercise: user?.routine?.exercise || "",
  });

  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  };

  const handleFinish = async () => {
    setError("");

    // If doctor phone is provided, validate exact 10 digits
    if (form.phone.trim() && !validatePhone(form.phone)) {
      setError(t?.errDoctorPhoneMinDigits || "Doctor phone number must contain exactly 10 digits.");
      return false;
    }

    await updateUser({
      doctor: {
        name: form.doctor.trim(),
        specialization: form.specialization.trim(),
        hospital: form.hospital.trim(),
        phone: form.phone.trim(),
      },
      routine: {
        wake: form.wake,
        sleep: form.sleep,
        breakfast: form.breakfast,
        lunch: form.lunch,
        dinner: form.dinner,
        exercise: form.exercise,
      },
      setupComplete: true,
    });

    if (role === "caregiver") {
      navigate("/caregiver", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
    return true;
  };

  const destination = role === "caregiver" ? "/caregiver" : "/dashboard";

  return (
    <OnboardingLayout
      step={5}
      title={t?.detailsTitle || "A Few More Details"}
      subtitle={t?.detailsSubtitle || "These details help us provide better assistance."}
      backTo="/onboarding/caregiver-details"
      nextTo={destination}
      nextAction={handleFinish}
      nextLabel={t?.finishSetup || "Finish Setup"}
    >
      {error && (
        <div className="error-note" style={{ marginBottom: "16px" }}>
          <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          <span>{error}</span>
        </div>
      )}

      <div className="subheading-row">
        <h3>
          {t?.doctorInfoTitle || "Doctor Information (Optional)"}
        </h3>
      </div>
      <div className="form-grid">
        <label className="form-field">
          <span className="field-label">{t?.doctorName || "Doctor Name"}</span>
          <input
            value={form.doctor}
            onChange={(e) => update("doctor", e.target.value)}
            placeholder={t?.doctorNamePlaceholder || "Doctor Name"}
          />
        </label>
        <label className="form-field">
          <span className="field-label">{t?.specialization || "Specialization"}</span>
          <input
            value={form.specialization}
            onChange={(e) => update("specialization", e.target.value)}
            placeholder={t?.specializationPlaceholder || "Specialization"}
          />
        </label>
        <label className="form-field">
          <span className="field-label">{t?.hospital || "Hospital / Clinic"}</span>
          <input
            value={form.hospital}
            onChange={(e) => update("hospital", e.target.value)}
            placeholder={t?.hospitalPlaceholder || "Hospital / Clinic"}
          />
        </label>
        <label className="form-field">
          <span className="field-label">{t?.doctorPhone || "Phone Number"}</span>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder={t?.doctorPhonePlaceholder || "10-digit Doctor Phone"}
          />
        </label>
      </div>

      <div className="subheading-row mt-24">
        <h3>
          {t?.dailyRoutineTitle || "Daily Routine (Optional)"}
        </h3>
      </div>
      <div className="routine-grid">
        {[
          ["wake", t?.wakeTime || "Wake-up time", BedDouble],
          ["sleep", t?.sleepTime || "Sleep time", Moon],
          ["breakfast", t?.breakfastTime || "Breakfast time", Coffee],
          ["lunch", t?.lunchTime || "Lunch time", Utensils],
          ["dinner", t?.dinnerTime || "Dinner time", Utensils],
          ["exercise", t?.exerciseTime || "Exercise / Walk time", Dumbbell],
        ].map(([key, label, Icon]) => (
          <label className="routine-item" key={key}>
            <span className="routine-icon">
              <Icon size={16} />
            </span>
            <span>{label}</span>
            <input
              type="time"
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="info-note">
        <Activity size={16} />
        <span>{t?.infoNote || "Medicines, memories and appointments can be added after setup."}</span>
      </div>
    </OnboardingLayout>
  );
}
