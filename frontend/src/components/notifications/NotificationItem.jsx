import { Check, Trash2, Bell, Calendar, Pill, HeartHandshake, ShieldAlert, Sparkles, Info } from "lucide-react";

export default function NotificationItem({ notification, t, onMarkRead, onDelete }) {
  const { id, title, text, type, category, timestamp, read } = notification;

  const getCategoryDetails = (cat, itemType) => {
    const key = cat || itemType || "general";
    switch (key) {
      case "medicine":
        return {
          icon: Pill,
          iconClass: "notif-icon-medicine",
          pillClass: "badge-medicine",
          label: t?.catMedicineBadge || "Medicine",
          emoji: "💊",
        };
      case "appointment":
        return {
          icon: Calendar,
          iconClass: "notif-icon-appointment",
          pillClass: "badge-appointment",
          label: t?.catAppointmentBadge || "Appointment",
          emoji: "📅",
        };
      case "caregiver":
        return {
          icon: HeartHandshake,
          iconClass: "notif-icon-caregiver",
          pillClass: "badge-caregiver",
          label: t?.catCaregiverBadge || "Caregiver",
          emoji: "🤝",
        };
      case "emergency":
        return {
          icon: ShieldAlert,
          iconClass: "notif-icon-emergency",
          pillClass: "badge-emergency",
          label: t?.catEmergencyBadge || "Emergency",
          emoji: "🚨",
        };
      case "assistant":
      case "system":
        return {
          icon: Sparkles,
          iconClass: "notif-icon-assistant",
          pillClass: "badge-system",
          label: t?.catAssistantBadge || "Assistant",
          emoji: "✦",
        };
      default:
        return {
          icon: Info,
          iconClass: "notif-icon-general",
          pillClass: "badge-general",
          label: t?.catGeneralBadge || "General",
          emoji: "ℹ️",
        };
    }
  };

  const details = getCategoryDetails(category, type);
  const Icon = details.icon;

  return (
    <div className={`notification-card ${read ? "is-read" : "is-unread"}`}>
      <div className={`notification-avatar ${details.iconClass}`}>
        <Icon size={18} />
      </div>

      <div className="notification-body">
        <div className="notification-title-row">
          <div className="notification-title-group">
            <span className={`notification-category-pill ${details.pillClass}`}>
              {details.label}
            </span>
            <h4 className="notification-heading">{title || (t?.memoMindNotification || "MemoMind Notification")}</h4>
            {!read && <span className="unread-dot" title={t?.unread || "Unread"} />}
          </div>
          <span className="notification-time">{timestamp || "Recently"}</span>
        </div>

        <p className="notification-text">{text}</p>

        <div className="notification-actions-row">
          {!read && (
            <button
              type="button"
              className="text-btn notif-action-btn"
              onClick={() => onMarkRead(id)}
              title={t?.markAsReadBtn || "Mark as read"}
            >
              <Check size={13} />
              <span>{t?.markAsReadBtn || "Mark as read"}</span>
            </button>
          )}
          <button
            type="button"
            className="text-btn notif-action-btn danger-text"
            onClick={() => onDelete(id)}
            title={t?.dismissBtn || "Dismiss notification"}
          >
            <Trash2 size={13} />
            <span>{t?.dismissBtn || "Dismiss"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
