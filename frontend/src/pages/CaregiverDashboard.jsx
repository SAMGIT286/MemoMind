import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Pill,
  ShieldCheck,
  UserRound,
  Phone,
  HeartHandshake,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import RoleBadge from "../components/common/RoleBadge";

export default function CaregiverDashboard() {
  const { user, userDisplayName, role, transliterateName, t } = useAuth();
  const {
    medicines = [],
    localizedMedicines = [],
    appointments = [],
    localizedAppointments = [],
    memories = [],
    localizedMemories = [],
    markMedicineTaken,
  } = useApp();

  const medsToRender = localizedMedicines.length ? localizedMedicines : medicines;
  const apptsToRender = localizedAppointments.length ? localizedAppointments : appointments;
  const memoriesToRender = localizedMemories.length ? localizedMemories : memories;

  const rawPatientName = user?.patientName || user?.associatedPatient?.name || "Connected Loved One";
  const patientDisplayName = transliterateName ? transliterateName(rawPatientName) : rawPatientName;

  const patient = {
    id: user?.id || "patient-main",
    name: patientDisplayName,
    relationship: user?.patientRelationship || user?.associatedPatient?.relationship || (t?.roleElderly || "Patient"),
    age: user?.patientAge || user?.associatedPatient?.age || "60",
    phone: user?.patientPhone || user?.associatedPatient?.phone || "",
    address: user?.patientAddress || user?.associatedPatient?.address || "",
    doctor: user?.doctor?.name ? (transliterateName ? transliterateName(user.doctor.name) : user.doctor.name) : (t?.doctorName || "Doctor"),
    condition: t?.prefMemoryTrackingTitle || "Routine Care & Wellness",
    emergencyContact: user?.emergencyContacts?.[0]?.name ? (transliterateName ? transliterateName(user.emergencyContacts[0].name) : user.emergencyContacts[0].name) : (t?.roleEmergency || "Emergency Contact"),
  };

  const takenMeds = medsToRender.filter((m) => m.status === "taken").length;
  const adherenceRate = medsToRender.length
    ? Math.round((takenMeds / medsToRender.length) * 100)
    : 100;

  return (
    <div className="page">
      <div className="page-heading-row">
        <div className="page-heading">
          <div className="eyebrow">{t?.caregiverPortalEyebrow || "AUTHORIZED CAREGIVER PORTAL"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.caregiverDashboardTitle || "Caregiver Dashboard"}</h1>
            <RoleBadge role="caregiver" />
          </div>
          <p>
            {t?.caregiverMonitorSub
              ? t.caregiverMonitorSub(patient.name)
              : `Monitor and support ${patient.name}'s medication schedule, appointments, and wellbeing.`}
          </p>
        </div>

        <div className="patient-selector-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{t?.activePatientLabel || "Active Patient:"}</span>
          <select className="patient-select" style={{ fontWeight: 600 }}>
            <option>{patient.name} ({patient.relationship})</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <CareStat
          icon={Pill}
          value={`${adherenceRate}%`}
          label={t?.todaysMedAdherence || "Today's Medicine Adherence"}
          badge={t?.takenMedsBadge ? t.takenMedsBadge(takenMeds, medsToRender.length) : `${takenMeds}/${medsToRender.length} taken`}
        />
        <CareStat
          icon={CalendarDays}
          value={apptsToRender.length}
          label={t?.scheduledDoctorVisits || "Scheduled Doctor Visits"}
          badge={t?.upcomingBadge || "Upcoming"}
        />
        <CareStat
          icon={Activity}
          value={`${memoriesToRender.length} logs`}
          label={t?.dailyActivityRoutine || "Daily Activity & Routine"}
          badge={t?.activeTodayBadge || "Active Today"}
        />
        <CareStat
          icon={ShieldCheck}
          value={t?.normalBadge || "Normal"}
          label={t?.healthAlertStatus || "Health & Alert Status"}
          badge={t?.noAlertsBadge || "No Alerts"}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{patient.name} · {t?.medicationRoutine || "Medication Routine"}</h2>
              <p>{t?.adherenceScheduledDoses || "Adherence and scheduled doses"}</p>
            </div>
            <Pill size={18} />
          </div>

          <div className="summary-list">
            {medsToRender.map((m) => (
              <div
                key={m.id}
                className="schedule-row"
                style={{ gridTemplateColumns: "60px 24px 1fr auto" }}
              >
                <span className="schedule-time">{m.time}</span>
                <span className="schedule-icon">💊</span>
                <div>
                  <strong>{m.name}</strong>
                  <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                    {m.dosage} · {m.frequency}
                  </div>
                </div>
                {m.status === "taken" ? (
                  <span className="status-pill success">
                    <Check size={12} /> {t?.takenAtPrefix || "Taken at"} {m.takenAt || m.time}
                  </span>
                ) : (
                  <button
                    className="mini-btn"
                    onClick={() => markMedicineTaken(m.id)}
                    title={t?.markAsTaken || "Confirm Taken"}
                  >
                    {t?.markAsTaken || "Confirm Taken"}
                  </button>
                )}
              </div>
            ))}

            {!medsToRender.length && (
              <div className="empty-state">{t?.noMedicinesYet || "No medications registered for this patient."}</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{t?.quickActions || "Care Actions"}</h2>
              <p>{t?.safetyContacts || "Items requiring attention"}</p>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="alert-card good">
            <CheckCircle2 size={17} />
            <div>
              <strong>{t?.activeAndProtected || "Adherence Tracking Active"}</strong>
              <span>{t?.securityTip || "Care updates and medication records synced in real-time."}</span>
            </div>
          </div>

          <div className="caregiver-quick-actions" style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {patient.phone ? (
              <a
                href={`tel:${patient.phone}`}
                className="settings-action"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="action-icon">
                    <Phone size={16} />
                  </div>
                  <div>
                    <strong>{t?.phone || "Call"} {patient.name}</strong>
                    <span>{patient.phone}</span>
                  </div>
                </div>
                <span className="action-arrow">→</span>
              </a>
            ) : null}

            <Link
              to="/timeline"
              className="settings-action"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="action-icon">
                  <Activity size={16} />
                </div>
                <div>
                  <strong>{t?.viewPatientTimeline || "Inspect Full Activity Timeline"}</strong>
                  <span>{t?.timelineSub || "View log entries, medications and routines"}</span>
                </div>
              </div>
              <span className="action-arrow">→</span>
            </Link>

            <Link
              to="/assistant"
              className="settings-action"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="action-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <strong>{t?.askAiAssistant || "Ask Caregiver AI Assistant"}</strong>
                  <span>{t?.queryLatestLogs || "Query patient adherence logs"}</span>
                </div>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function CareStat({ icon: Icon, value, label, badge }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <strong>{value}</strong>
          {badge && <span className="pill green" style={{ fontSize: "8px" }}>{badge}</span>}
        </div>
        <span>{label}</span>
      </div>
    </div>
  );
}
