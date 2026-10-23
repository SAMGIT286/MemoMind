import { Bell, ChevronDown, Check, Sparkles, ExternalLink, Trash2, Languages } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import RoleBadge from "../common/RoleBadge";

export default function Topbar() {
  const { user, userDisplayName, role, t, language, setLanguage } = useAuth();
  const { notifications = [], localizedNotifications = [], markAllNotificationsRead, clearNotifications, markNotificationRead } = useApp();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  const notifsToRender = localizedNotifications.length ? localizedNotifications : notifications;
  const unread = notifsToRender.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = () => {
    setOpen((v) => !v);
  };

  const getBreadcrumb = () => {
    switch (role) {
      case "young_professional":
        return t?.breadcrumbPersonal || "Personal Organization & Wellness Hub";
      case "caregiver":
        return t?.breadcrumbCaregiver || "Caregiver Monitoring & Adherence Portal";
      case "emergency_contact":
        return t?.breadcrumbEmergency || "Emergency Contact & Safety Network (Read-Only)";
      default:
        return t?.breadcrumbElderly || "Personal Memory & Daily Care Assistant";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumb">{getBreadcrumb()}</div>
      </div>

      <div className="topbar-actions">
        {/* Topbar Language Switcher */}
        <div className="topbar-lang-wrap" title={t?.changeLanguage || "Change Language"}>
          <Languages size={15} />
          <select
            className="topbar-lang-select"
            value={language || "English"}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select Language"
          >
            <option value="English">English</option>
            <option value="Hindi">हिंदी</option>
            <option value="Marathi">मराठी</option>
          </select>
        </div>

        {/* Notification Bell */}
        <div className="notification-wrap" ref={popoverRef}>
          <button
            type="button"
            className="icon-btn notification-btn"
            onClick={toggle}
            title={t?.navNotifications || "Notifications"}
          >
            <Bell size={19} />
            {unread > 0 && <span className="notification-dot">{unread}</span>}
          </button>

          {open && (
            <div className="notification-popover">
              <div className="notification-head">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong>{t?.navNotifications || "Notifications"}</strong>
                  {unread > 0 && <span className="pill green" style={{ fontSize: "8px" }}>{unread} {t?.newBadge || "new"}</span>}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {unread > 0 && (
                    <button type="button" onClick={markAllNotificationsRead} style={{ color: "var(--green-800)" }}>
                      {t?.markAllRead || "Mark Read"}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button type="button" onClick={clearNotifications} style={{ color: "var(--danger)" }}>
                      {t?.clear || "Clear"}
                    </button>
                  )}
                </div>
              </div>

              <div className="notification-popover-list">
                {notifsToRender.length ? (
                  notifsToRender.slice(0, 5).map((n) => (
                    <div
                      className={`notification-item ${n.read ? "read" : "unread"}`}
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <span className={`notification-icon ${n.type || "general"}`}>
                        {n.category === "medicine" || n.type === "medicine"
                          ? "💊"
                          : n.category === "appointment" || n.type === "appointment"
                          ? "📅"
                          : n.category === "caregiver" || n.type === "caregiver"
                          ? "🤝"
                          : n.category === "emergency" || n.type === "emergency"
                          ? "🚨"
                          : "✦"}
                      </span>
                      <div className="notif-popover-text">
                        <strong>{n.title || n.text}</strong>
                        <span>{n.text}</span>
                        <small>{n.timestamp || "Recently"}</small>
                      </div>
                      {!n.read && <span className="unread-dot" />}
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: "16px" }}>
                    {t?.noNotificationsFound || "No notifications."}
                  </div>
                )}
              </div>

              <div className="notification-popover-footer">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="popover-all-link"
                >
                  <span>{t?.viewAll || "View all"} {t?.navNotifications || "notifications"}</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Mini */}
        <Link to="/settings" className="user-mini" title="Account settings">
          {user?.photoUrl ? (
            <div
              className="avatar avatar-sm"
              style={{ overflow: "hidden" }}
            >
              <img
                src={user.photoUrl}
                alt={userDisplayName || user.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div className="avatar avatar-sm">{initials(userDisplayName || user?.name)}</div>
          )}

          <div className="user-mini-copy">
            <strong>{userDisplayName || user?.name || "MemoMind User"}</strong>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <RoleBadge role={role} />
            </div>
          </div>
          <ChevronDown size={14} style={{ color: "var(--muted)" }} />
        </Link>
      </div>
    </header>
  );
}

function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "MM"
  );
}
