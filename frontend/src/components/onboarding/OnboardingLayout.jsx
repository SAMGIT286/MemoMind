import { ArrowLeft, ArrowRight, Check, SkipForward, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function OnboardingLayout({
  step,
  title,
  subtitle,
  children,
  nextTo,
  backTo,
  skipTo,
  onSkip,
  nextAction,
  nextLabel,
}) {
  const navigate = useNavigate();
  const { updateUser, t, language, setLanguage } = useAuth();

  const stepLabels = [
    t?.stepType || "Type",
    t?.stepPersonal || "Personal",
    t?.stepContacts || "Contacts",
    t?.stepCaregiver || "Caregiver",
    t?.stepDetails || "Details",
  ];

  const handleNext = async () => {
    if (nextAction) {
      const result = await nextAction();
      if (result === false) return; // Prevent navigation if validation fails
    }

    if (nextTo === "/dashboard" || nextTo === "/caregiver") {
      await updateUser({ setupComplete: true });
    }

    if (nextTo) {
      navigate(nextTo);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    if (skipTo) {
      navigate(skipTo);
    }
  };

  const currentNextLabel = nextLabel || (step === 5 ? (t?.finishSetup || "Finish Setup") : (t?.next || "Next"));

  return (
    <div className="onboarding-page">
      <div className="onboarding-top">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <div className="brand-name">{t?.appName || "MemoMind"}</div>
            <div className="brand-tagline">{t?.tagline || "Remember Today. Live Better."}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="topbar-lang-wrap" title="Change Language">
            <Languages size={14} />
            <select
              className="topbar-lang-select"
              value={language || "English"}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select Language"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Marathi">मराठी</option>
              <option value="Spanish">Español</option>
              <option value="French">Français</option>
              <option value="Bengali">বাংলা</option>
              <option value="Tamil">தமிழ்</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Arabic">العربية</option>
            </select>
          </div>

          <div className="onboarding-step-text">
            {t?.stepOf ? t.stepOf(step, stepLabels.length) : `Step ${step} of ${stepLabels.length}`}
          </div>
        </div>
      </div>

      <div className="progress-track">
        {stepLabels.map((s, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < step;
          const isActive = stepNum === step;

          return (
            <div
              key={s}
              className={`progress-segment ${isDone ? "done" : isActive ? "active" : ""}`}
            >
              <span>{isDone ? <Check size={12} /> : stepNum}</span>
              <small>{s}</small>
            </div>
          );
        })}
      </div>

      <div className="onboarding-card">
        <div className="page-heading centered">
          <div className="eyebrow">{t?.setupEyebrow || "MEMOMIND SETUP"}</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div>{children}</div>

        <div className="onboarding-actions">
          {backTo ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft size={16} /> {t?.back || "Back"}
            </button>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {skipTo && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleSkip}
                style={{ color: "var(--muted)" }}
              >
                <span>{t?.skip || "Skip for now"}</span>
                <SkipForward size={14} />
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
            >
              <span>{currentNextLabel}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
