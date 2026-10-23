import {
  CalendarDays,
  Check,
  Clock3,
  Pill,
  Plus,
  Sparkles,
  Users,
  Phone,
  ShieldAlert,
  HeartHandshake,
  ArrowRight,
  BriefcaseBusiness,
  Activity,
  Heart,
  AlertTriangle,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "../components/common/RoleBadge";
import ReadOnlyBanner from "../components/common/ReadOnlyBanner";
import { useCurrentGreeting, getWelcomeMessage, getLocalizedDate } from "../utils/time";

export default function Dashboard() {
  const {
    medicines = [],
    localizedMedicines = [],
    appointments = [],
    localizedAppointments = [],
    markMedicineTaken,
  } = useApp();
  const {
    user,
    userDisplayName,
    role,
    isElderly,
    isYoungProfessional,
    isCaregiver,
    isEmergencyContact,
    isReadOnly,
    language,
    transliterateName,
    t,
  } = useAuth();

  const greeting = useCurrentGreeting(language, userDisplayName || user?.name);
  const welcomeSub = getWelcomeMessage(language);

  const medsToRender = localizedMedicines.length ? localizedMedicines : medicines;
  const apptsToRender = localizedAppointments.length ? localizedAppointments : appointments;

  const upcoming = [...apptsToRender].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  )[0];

  const today = getLocalizedDate(new Date(), language, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // If Emergency Contact role: render Emergency Contact Read-Only Dashboard
  if (isEmergencyContact) {
    const rawPatient = user?.associatedPatient?.name || user?.name || (t?.roleElderly || "Connected Patient");
    const patientName = transliterateName ? transliterateName(rawPatient) : rawPatient;
    const patientRelationship = user?.associatedPatient?.relationship || "Family Member";

    return (
      <div className="dashboard-page">
        <ReadOnlyBanner patientName={patientName} />

        <div className="welcome-row" style={{ marginTop: "16px" }}>
          <div>
            <div className="eyebrow">{today.toUpperCase()} · {t?.emergencyMonitoring || "EMERGENCY MONITORING"}</div>
            <h1>{greeting}</h1>
            <p>
              {t?.monitoring || "Monitoring:"} <strong>{patientName}</strong> ({patientRelationship}) · {t?.status || "Status:"} <span className="pill green">{t?.activeAndProtected || "Active & Protected"}</span>
            </p>
          </div>
          <Link to="/timeline" className="btn btn-primary">
            <Activity size={16} /> {t?.viewPatientTimeline || "View Patient Timeline"}
          </Link>
        </div>

        <div className="stats-grid">
          <StatCard icon={Pill} value={medsToRender.length} label={t?.activeMedicines || "Active Medicines"} />
          <StatCard icon={CalendarDays} value={apptsToRender.length} label={t?.upcomingVisits || "Upcoming Visits"} />
          <StatCard icon={Heart} value={t?.activeTodayBadge || "Active"} label={t?.vitalsMonitoring || "Vitals / Monitoring"} />
        </div>

        <div className="dashboard-grid">
          <section className="panel schedule-panel">
            <div className="panel-header">
              <div>
                <h2>{t?.medicationCareSchedule || "Medication & Care Schedule"}</h2>
                <p>{t?.realTimeAdherenceReadOnly || "Real-time adherence overview (Read-only)"}</p>
              </div>
              <Clock3 size={18} />
            </div>

            {medsToRender.slice(0, 4).map((m) => (
              <ScheduleRow
                key={m.id}
                time={m.time}
                title={`${m.name} (${m.dosage})`}
                icon="💊"
                action={
                  m.status === "taken" ? (
                    <span className="status-pill success">
                      <Check size={12} /> {t?.takenAtPrefix || "Taken at"} {m.takenAt || m.time}
                    </span>
                  ) : (
                    <span className="status-pill warning" style={{ background: "#fff6e6", color: "#b37400" }}>
                      {t?.scheduledStatus || "Scheduled"}
                    </span>
                  )
                }
              />
            ))}

            {upcoming && (
              <ScheduleRow
                time={upcoming.time}
                title={`${t?.navAppointments || "Appointment"}: ${upcoming.title} (${upcoming.doctorName || "Doctor"})`}
                icon="🩺"
                action={<span className="status-pill info">{upcoming.date}</span>}
              />
            )}

            {!medsToRender.length && !upcoming && (
              <div className="empty-state">{t?.noScheduledMedsAppointments || "No scheduled medicines or appointments registered yet."}</div>
            )}
          </section>

          <section className="panel quick-panel">
            <div className="panel-header">
              <div>
                <h2>{t?.emergencyCareNetwork || "Emergency & Care Network"}</h2>
                <p>{t?.safetyContacts || "Safety contacts"}</p>
              </div>
              <ShieldAlert size={18} style={{ color: "var(--danger)" }} />
            </div>

            <div className="emergency-contact-box">
              {user?.doctor?.name ? (
                <div className="contact-line">
                  <strong>{t?.primaryDoctorLabel || "Primary Doctor:"}</strong>
                  <span>{transliterateName(user.doctor.name)} {user.doctor.phone ? `(${user.doctor.phone})` : ""}</span>
                </div>
              ) : null}
              {user?.caregiver?.name ? (
                <div className="contact-line">
                  <strong>{t?.primaryCaregiverLabel || "Primary Caregiver:"}</strong>
                  <span>{transliterateName(user.caregiver.name)} {user.caregiver.phone ? `(${user.caregiver.phone})` : ""}</span>
                </div>
              ) : null}
              <div className="contact-line">
                <strong>{t?.emergencyHelplineLabel || "Emergency Helpline:"}</strong>
                <span style={{ color: "var(--danger)", fontWeight: "bold" }}>{t?.nationalEMS || "112 / 108 (National EMS)"}</span>
              </div>
            </div>

            <div className="assistant-card">
              <div className="assistant-card-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>{t?.askAiAssistant || "Ask AI Assistant"}</strong>
                <p>{t?.queryLatestLogs || "Query latest logs or medication records."}</p>
              </div>
              <Link to="/assistant" className="mini-round" title={t?.talkToAssistant || "Talk to AI Assistant"}>
                →
              </Link>
            </div>
          </section>
        </div>

      </div>
    );
  }

  // If Young Professional role: render productivity & wellness dashboard
  if (isYoungProfessional) {
    const hasCaregiver = !!(user?.caregiver && user?.caregiver?.name);

    return (
      <div className="dashboard-page">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">{today.toUpperCase()} · {t?.professionalDashboard || "PROFESSIONAL DASHBOARD"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ margin: "4px 0" }}>{greeting} ⚡</h1>
              <RoleBadge role="young_professional" />
            </div>
            <p>{welcomeSub}</p>
          </div>
          <Link to="/assistant" className="btn btn-primary" id="talk-to-assistant-btn">
            <Sparkles size={16} /> {t?.talkToAssistant || "Talk to assistant"}
          </Link>
        </div>

        <div className="stats-grid">
          <StatCard icon={Pill} value={medsToRender.length} label={t?.supplementsMeds || "Supplements & Meds"} />
          <StatCard icon={CalendarDays} value={apptsToRender.length} label={t?.appointmentsCalls || "Appointments & Calls"} />
          <StatCard
            icon={HeartHandshake}
            value={hasCaregiver ? "1" : "Optional"}
            label={hasCaregiver ? (t?.carePartnerConnected || "Care Partner Connected") : (t?.carePartnerOptional || "Care Partner (Optional)")}
          />
        </div>

        <div className="dashboard-grid">
          <section className="panel schedule-panel">
            <div className="panel-header">
              <div>
                <h2>{t?.todaysRoutineSchedule || "Today's Routine & Schedule"}</h2>
                <p>{t?.wellnessHabitsSchedule || "Wellness habits and schedule"}</p>
              </div>
              <Clock3 size={18} />
            </div>

            {medsToRender.slice(0, 4).map((m) => (
              <ScheduleRow
                key={m.id}
                time={m.time}
                title={`${m.name} (${m.dosage})`}
                icon="💊"
                action={
                  m.status !== "taken" ? (
                    <button className="mini-btn" onClick={() => markMedicineTaken(m.id)}>
                      {t?.markAsDone || "Mark as Done"}
                    </button>
                  ) : (
                    <span className="status-pill success">
                      <Check size={12} /> {t?.completed || "Completed"}
                    </span>
                  )
                }
              />
            ))}

            {upcoming && (
              <ScheduleRow
                time={upcoming.time}
                title={`${upcoming.title} · ${upcoming.doctorName || t?.navAppointments || "Appointment"}`}
                icon="📅"
              />
            )}

            {!medsToRender.length && !upcoming && (
              <div className="empty-state">
                {t?.scheduleClean || "Your schedule is clean. Add wellness routines, hydration prompts, or appointments."}
              </div>
            )}
          </section>

          <section className="panel quick-panel">
            <div className="panel-header">
              <div>
                <h2>{t?.quickActions || "Quick Actions"}</h2>
                <p>{t?.addRoutinesLogs || "Add routines & logs"}</p>
              </div>
            </div>

            <QuickAction to="/medicines" icon={Plus} label={t?.addSupplementMedicine || "Add Supplement / Medicine"} />
            <QuickAction to="/appointments" icon={Plus} label={t?.addAppointmentMeeting || "Add Appointment / Meeting"} />
            <QuickAction to="/timeline" icon={Plus} label={t?.logActivityMemory || "Log Activity / Memory"} />

            <div className="assistant-card">
              <div className="assistant-card-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>{t?.askAiAssistant || "Ask AI Assistant"}</strong>
                <p>{t?.queryScheduleVitamins || "Query your schedule, vitamins, or daily timeline."}</p>
              </div>
              <Link to="/assistant" className="mini-round" title={t?.talkToAssistant || "Talk to AI Assistant"}>
                →
              </Link>
            </div>

            {!hasCaregiver && (
              <div className="optional-caregiver-callout">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <HeartHandshake size={15} style={{ color: "var(--green-700)" }} />
                  <strong>{t?.carePartnerBuddy || "Care Partner / Health Buddy"}</strong>
                </div>
                <p>{t?.carePartnerNotice || "Want a family member or health partner to stay in sync? Setup is optional."}</p>
                <Link to="/settings" className="text-link">
                  {t?.addOptionalPartnerSettings || "Add optional partner in Settings →"}
                </Link>
              </div>
            )}
          </section>
        </div>

      </div>
    );
  }

  // Elderly Dashboard (Default / Standard Elderly Person Experience)
  const hasCaregiver = !!(user?.caregiver && user?.caregiver?.name);

  return (
    <div className="dashboard-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">{today.toUpperCase()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: "4px 0" }}>{greeting} 👋</h1>
            <RoleBadge role="elderly" />
          </div>
          <p>{welcomeSub}</p>
        </div>
        <Link to="/assistant" className="btn btn-primary" id="talk-to-assistant-btn">
          <Sparkles size={16} /> {t?.talkToAssistant || "Talk to assistant"}
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard icon={Pill} value={medsToRender.length} label={t?.medicinesToday || "Medicines today"} />
        <StatCard icon={CalendarDays} value={apptsToRender.length} label={t?.appointmentsCount || "Appointments"} />
        <StatCard
          icon={Users}
          value={hasCaregiver ? "1" : "0"}
          label={hasCaregiver ? (t?.caregiverConnected || "Caregiver connected") : (t?.noCaregiverLinked || "No caregiver linked")}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel schedule-panel">
          <div className="panel-header">
            <div>
              <h2>{t?.todaySchedule || "Today's Schedule"}</h2>
              <p>{t?.dayAtGlance || "Your day at a glance"}</p>
            </div>
            <Clock3 size={18} />
          </div>

          {medsToRender.slice(0, 4).map((m) => (
            <ScheduleRow
              key={m.id}
              time={m.time}
              title={`${m.name} (${m.dosage})`}
              icon="💊"
              action={
                m.status !== "taken" ? (
                  <button className="mini-btn" onClick={() => markMedicineTaken(m.id)}>
                    {t?.markAsTaken || "Mark as Taken"}
                  </button>
                ) : (
                  <span className="status-pill success">
                    <Check size={12} /> {t?.takenAtPrefix || "Taken at"} {m.takenAt || m.time}
                  </span>
                )
              }
            />
          ))}

          {upcoming && (
            <ScheduleRow
              time={upcoming.time}
              title={`${upcoming.title} ${upcoming.doctorName ? `(${upcoming.doctorName})` : ""}`}
              icon="🩺"
            />
          )}

          {!medsToRender.length && !upcoming && (
            <div className="empty-state">
              {t?.scheduleEmpty || "Your schedule is empty. Add a medicine or appointment to get started."}
            </div>
          )}
        </section>

        <section className="panel quick-panel">
          <div className="panel-header">
            <div>
              <h2>{t?.quickActions || "Quick Actions"}</h2>
              <p>{t?.commonTasks || "Common tasks"}</p>
            </div>
          </div>

          <QuickAction to="/medicines" icon={Plus} label={t?.addMedicine || "Add Medicine"} />
          <QuickAction to="/appointments" icon={Plus} label={t?.addAppointment || "Add Appointment"} />

          <div className="assistant-card">
            <div className="assistant-card-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>{t?.talkToAssistant || "Talk to your assistant"}</strong>
              <p>{t?.askAboutRecords || "Ask about your records, medicines or routine."}</p>
            </div>
            <Link to="/assistant" className="mini-round" title={t?.talkToAssistant || "Talk to AI Assistant"}>
              →
            </Link>
          </div>

          {hasCaregiver && (
            <div className="caregiver-quick-status">
              <HeartHandshake size={16} style={{ color: "var(--green-800)" }} />
              <div>
                <strong>{t?.caregiverCardHeader || "Caregiver:"} {transliterateName(user.caregiver.name)}</strong>
                <span>{user.caregiver.phone}</span>
              </div>
            </div>
          )}
        </section>
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ScheduleRow({ time, title, icon, action }) {
  return (
    <div className="schedule-row">
      <span className="schedule-time">{time}</span>
      <span className="schedule-icon">{icon}</span>
      <strong>{title}</strong>
      {action}
      <span className="schedule-check">
        <Check size={14} />
      </span>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link className="quick-action" to={to}>
      <span>
        <Icon size={15} />
      </span>
      {label}
      <b>+</b>
    </Link>
  );
}
