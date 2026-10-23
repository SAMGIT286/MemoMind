import { BriefcaseBusiness, HeartHandshake, ShieldAlert, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function UserType() {
  const navigate = useNavigate();
  const { user, updateUser, role, t } = useAuth();
  const [selected, setSelected] = useState(role || user?.role || "elderly");

  const types = [
    {
      id: "young_professional",
      title: t?.roleYpTitle || "Young Professional",
      text: t?.roleYpDesc || "Stay organized and remember what matters.",
      icon: BriefcaseBusiness,
    },
    {
      id: "elderly",
      title: t?.roleElderlyTitle || "Elderly Person",
      text: t?.roleElderlyDesc || "Get personalized assistance and reminders.",
      icon: UserRound,
    },
    {
      id: "caregiver",
      title: t?.roleCaregiverTitle || "Caregiver Access",
      text: t?.roleCaregiverDesc || "Monitor and support your loved one.",
      icon: HeartHandshake,
    },
    {
      id: "emergency_contact",
      title: t?.roleEmergencyTitle || "Emergency Contact",
      text: t?.roleEmergencyDesc || "Read-only access to patient timeline and emergency details.",
      icon: ShieldAlert,
    },
  ];

  const handleNext = () => {
    updateUser({ role: selected, userType: selected });
    navigate("/onboarding/personal-details");
  };

  return (
    <OnboardingLayout
      step={1}
      title={t?.userTypeTitle || "Welcome!"}
      subtitle={t?.userTypeSubtitle || "Tell us a little about yourself so we can personalize your experience."}
      nextAction={handleNext}
      nextTo="/onboarding/personal-details"
    >
      <div className="choice-grid">
        {types.map(({ id, title, text, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`choice-card ${selected === id ? "selected" : ""}`}
            onClick={() => {
              setSelected(id);
              updateUser({ role: id, userType: id });
            }}
          >
            <div className="choice-icon">
              <Icon size={25} />
            </div>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </button>
        ))}
      </div>
    </OnboardingLayout>
  );
}
