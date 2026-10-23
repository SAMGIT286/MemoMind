import { Bell, ShieldCheck } from "lucide-react";
import NotificationsPanel from "../components/notifications/NotificationsPanel";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "../components/common/RoleBadge";

export default function Notifications() {
  const { user, role, t } = useAuth();

  return (
    <div className="page">
      <div className="page-heading-row">
        <div className="page-heading">
          <div className="eyebrow">{t?.alertsNotificationsEyebrow || "ALERTS & NOTIFICATIONS"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.notificationsTitle || "Notifications"}</h1>
            <RoleBadge role={role} />
          </div>
          <p>{t?.notificationsSub || "Stay updated on medication reminders, appointments, caregiver check-ins and alerts."}</p>
        </div>
      </div>

      <div className="panel" style={{ padding: "20px" }}>
        <NotificationsPanel />
      </div>
    </div>
  );
}
