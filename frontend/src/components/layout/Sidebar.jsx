import { NavLink } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Pill,
  Settings,
  Sparkles,
  ShieldAlert,
  UserRound,
  Users,
  Camera,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const { logout, role, isElderly, isYoungProfessional, isCaregiver, isEmergencyContact, t } = useAuth();

  const getLinks = () => {
    if (isCaregiver) {
      return [
        { to: "/caregiver", label: t?.navCaregiverPortal || "Caregiver Portal", icon: HeartHandshake },
        { to: "/timeline", label: t?.navPatientTimeline || "Patient Timeline", icon: Activity },
        { to: "/find-my-people", label: t?.navFindPeople || "Find My People", icon: Users },
        { to: "/find-things", label: t?.navFindThings || "Find My Things", icon: Camera },
        { to: "/medicines", label: t?.navMedicines || "Patient Medicines", icon: Pill },
        { to: "/appointments", label: t?.navAppointments || "Appointments", icon: CalendarDays },
        { to: "/assistant", label: t?.navAssistant || "AI Assistant", icon: Sparkles },
        { to: "/notifications", label: t?.navNotifications || "Notifications", icon: Bell },
        { to: "/settings", label: t?.navSettings || "Settings", icon: Settings },
      ];
    }

    if (isEmergencyContact) {
      return [
        { to: "/dashboard", label: t?.navEmergencyOverview || "Emergency Overview", icon: ShieldAlert },
        { to: "/timeline", label: t?.navPatientTimeline || "Patient Timeline", icon: Activity },
        { to: "/find-my-people", label: t?.navFindPeople || "Find My People", icon: Users },
        { to: "/find-things", label: t?.navFindThings || "Find My Things", icon: Camera },
        { to: "/medicines", label: t?.navMedicationPlan || "Medication Plan", icon: Pill },
        { to: "/appointments", label: t?.navDoctorSchedule || "Doctor Schedule", icon: CalendarDays },
        { to: "/assistant", label: t?.navAssistant || "AI Assistant", icon: Sparkles },
        { to: "/notifications", label: t?.navAlertsNotifs || "Alerts & Notifs", icon: Bell },
        { to: "/settings", label: t?.navSettings || "Settings", icon: Settings },
      ];
    }

    if (isYoungProfessional) {
      return [
        { to: "/dashboard", label: t?.navDashboard || "Dashboard", icon: LayoutDashboard },
        { to: "/assistant", label: t?.navAssistant || "AI Assistant", icon: Sparkles },
        { to: "/find-my-people", label: t?.navFindPeople || "Find My People", icon: Users },
        { to: "/find-things", label: t?.navFindThings || "Find My Things", icon: Camera },
        { to: "/medicines", label: t?.navSupplementsMeds || "Supplements & Meds", icon: Pill },
        { to: "/appointments", label: t?.navAppointments || "Appointments", icon: CalendarDays },
        { to: "/timeline", label: t?.navTimelineLogs || "Timeline & Logs", icon: Activity },
        { to: "/notifications", label: t?.navNotifications || "Notifications", icon: Bell },
        { to: "/settings", label: t?.navSettings || "Settings", icon: Settings },
      ];
    }

    // Default: Elderly Person
    return [
      { to: "/dashboard", label: t?.navDashboard || "Dashboard", icon: LayoutDashboard },
      { to: "/assistant", label: t?.navAssistant || "AI Assistant", icon: Sparkles },
      { to: "/find-my-people", label: t?.navFindPeople || "Find My People", icon: Users },
      { to: "/find-things", label: t?.navFindThings || "Find My Things", icon: Camera },
      { to: "/medicines", label: t?.navMedicines || "Medicines", icon: Pill },
      { to: "/appointments", label: t?.navAppointments || "Appointments", icon: CalendarDays },
      { to: "/timeline", label: t?.navTimeline || "Timeline", icon: Activity },
      { to: "/caregiver", label: t?.navCaregiver || "Caregiver", icon: HeartHandshake },
      { to: "/notifications", label: t?.navNotifications || "Notifications", icon: Bell },
      { to: "/settings", label: t?.navSettings || "Settings", icon: Settings },
    ];
  };

  const links = getLinks();

  return (
    <aside className="sidebar">
      <div className="brand brand-sidebar">
        <div className="brand-mark">✦</div>
        <div>
          <div className="brand-name">{t?.appName || "MemoMind"}</div>
          <div className="brand-tagline">{t?.tagline || "Remember Today. Live Better."}</div>
        </div>
      </div>

      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <MessageCircle size={15} />
          <span>{t?.securityTip || "Your health records are secure."}</span>
        </div>
        <button type="button" className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          {t?.logout || "Logout"}
        </button>
      </div>
    </aside>
  );
}
