import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ReadOnlyBanner({ message, patientName }) {
  const { t } = useAuth();

  return (
    <div className="read-only-banner">
      <div className="read-only-icon">
        <ShieldAlert size={18} />
      </div>
      <div className="read-only-content">
        <strong>{t?.readOnlyBannerTitle || "Emergency Contact — Read-Only Mode"}</strong>
        <p>
          {message ||
            (t?.readOnlyBannerDesc
              ? t.readOnlyBannerDesc(patientName)
              : `You have view-only access to ${patientName || "the patient"}'s activity timeline, medications, and emergency profile. You cannot modify or delete records.`)}
        </p>
      </div>
    </div>
  );
}
