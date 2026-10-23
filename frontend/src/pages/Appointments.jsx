import { Pencil, Plus, Trash2, CalendarDays, Clock, MapPin, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/common/Modal";
import RoleBadge from "../components/common/RoleBadge";
import ReadOnlyBanner from "../components/common/ReadOnlyBanner";
import { validatePhone } from "../utils/validation";
import { getLocalizedDate } from "../utils/time";

const empty = {
  title: "",
  doctorName: "",
  specialization: "",
  hospital: "",
  phone: "",
  date: new Date().toISOString().slice(0, 10),
  time: "11:00 AM",
  location: "",
  reminder: "30 minutes before",
};

export default function Appointments() {
  const {
    appointments = [],
    localizedAppointments = [],
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useApp();
  const { user, userDisplayName, role, isReadOnly, isEmergencyContact, language, transliterateName, t } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const apptsToRender = localizedAppointments.length ? localizedAppointments : appointments;

  const add = () => {
    if (isReadOnly) return;
    setEditing(null);
    setForm(empty);
    setError("");
    setOpen(true);
  };

  const edit = (a) => {
    if (isReadOnly) return;
    // Always edit original record so original content is preserved
    const orig = appointments.find((item) => item.id === a.id) || a;
    setEditing(orig.id);
    setForm({ ...orig });
    setError("");
    setOpen(true);
  };

  const save = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setError("");

    if (!form.title.trim()) {
      setError(t?.errAppointmentTitleRequired || "Please enter appointment title.");
      return;
    }

    if (form.phone.trim() && !validatePhone(form.phone)) {
      setError(t?.errDoctorPhoneMinDigits || "Doctor phone number must contain exactly 10 digits.");
      return;
    }

    editing ? updateAppointment(editing, form) : addAppointment(form);
    setOpen(false);
  };

  const rawPatient = user?.associatedPatient?.name || user?.name || (t?.roleElderly || "Connected Patient");
  const patientName = transliterateName ? transliterateName(rawPatient) : rawPatient;

  return (
    <div className="page">
      {isEmergencyContact && (
        <div style={{ marginBottom: "16px" }}>
          <ReadOnlyBanner patientName={patientName} />
        </div>
      )}

      <div className="page-heading-row">
        <div className="page-heading">
          <div className="eyebrow">{t?.appointmentsVisitsEyebrow || "APPOINTMENTS & DOCTOR VISITS"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.navAppointments || "Appointments"}</h1>
            <RoleBadge role={role} />
          </div>
          <p>
            {isEmergencyContact
              ? (t?.viewingAppointmentsFor ? t.viewingAppointmentsFor(patientName) : `Viewing upcoming medical visits and consultations for ${patientName}.`)
              : (t?.appointmentsDesc || "Keep track of scheduled consultations, checkups, and reminders.")}
          </p>
        </div>

        {!isReadOnly && (
          <button className="btn btn-primary" onClick={add}>
            <Plus size={16} /> {t?.addAppointment || "Add Appointment"}
          </button>
        )}
      </div>

      <div className="tabs">
        <button className="tab active">
          {t?.upcomingScheduleCount ? t.upcomingScheduleCount(apptsToRender.length) : `Upcoming Schedule (${apptsToRender.length})`}
        </button>
      </div>

      <div className="appointment-list">
        {apptsToRender.map((a) => (
          <AppointmentRow
            key={a.id}
            appointment={a}
            isReadOnly={isReadOnly}
            language={language}
            t={t}
            onEdit={() => edit(a)}
            onDelete={() =>
              window.confirm(t?.confirmDeleteAppointment ? t.confirmDeleteAppointment(a.title) : `Delete ${a.title}?`) && deleteAppointment(a.id)
            }
          />
        ))}
      </div>

      {!apptsToRender.length && (
        <div className="panel empty-state">{t?.noAppointmentsRegistered || "No upcoming appointments scheduled."}</div>
      )}

      {open && !isReadOnly && (
        <Modal
          title={editing ? (t?.editAppointmentTitle || "Edit Appointment Details") : (t?.addNewAppointmentTitle || "Add New Appointment")}
          onClose={() => setOpen(false)}
        >
          <form className="stack-form" onSubmit={save}>
            {error && (
              <div className="error-note" style={{ marginBottom: "10px" }}>
                <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                <span>{error}</span>
              </div>
            )}

            <label className="form-field">
              <span className="field-label">{t?.appointmentTitleLabel || "Appointment Title *"}</span>
              <input
                required
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setError("");
                }}
                placeholder={t?.appointmentTitlePlaceholder || "e.g. Regular Health Checkup"}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span className="field-label">{t?.doctorNameLabel || "Doctor / Specialist Name"}</span>
                <input
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  placeholder={t?.doctorNamePlaceholder || "e.g. Dr. Ramesh Sharma"}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.specializationLabel || "Specialization / Department"}</span>
                <input
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  placeholder={t?.specializationPlaceholder || "e.g. Cardiologist"}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.hospitalLabel || "Hospital / Clinic"}</span>
                <input
                  value={form.hospital}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                  placeholder={t?.hospitalPlaceholder || "e.g. City Care Hospital"}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.doctorPhoneLabel || "Contact Number (optional)"}</span>
                <input
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    setError("");
                  }}
                  placeholder={t?.doctorPhonePlaceholder || "10-digit number"}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.dateLabel || "Date"}</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.timeLabel || "Time"}</span>
                <input
                  type="text"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  placeholder="11:00 AM"
                />
              </label>
            </div>

            <label className="form-field">
              <span className="field-label">{t?.locationLabel || "Location / Address"}</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder={t?.locationPlaceholder || "e.g. Room 402, OPD Wing"}
              />
            </label>

            <label className="form-field">
              <span className="field-label">{t?.reminderLabel || "Reminder"}</span>
              <select
                value={form.reminder}
                onChange={(e) => setForm({ ...form, reminder: e.target.value })}
              >
                <option value="30 minutes before">{t?.remind30Min || "30 minutes before"}</option>
                <option value="1 hour before">{t?.remind1Hour || "1 hour before"}</option>
                <option value="2 hours before">{t?.remind2Hours || "2 hours before"}</option>
                <option value="1 day before">{t?.remind1Day || "1 day before"}</option>
              </select>
            </label>

            <button className="btn btn-primary btn-full" type="submit">
              {editing ? (t?.saveChanges || "Save Changes") : (t?.saveAppointmentBtn || "Save Appointment")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AppointmentRow({ appointment, isReadOnly, language, t, onEdit, onDelete }) {
  const dateObj = new Date(`${appointment.date}T12:00:00`);
  const isValidDate = !Number.isNaN(dateObj.getTime());
  const month = isValidDate
    ? getLocalizedDate(dateObj, language, { month: "short" }).toUpperCase()
    : "OCT";
  const day = isValidDate ? dateObj.getDate() : "12";

  return (
    <div className="appointment-card">
      <div className="date-block">
        <span>{month}</span>
        <strong>{day}</strong>
      </div>
      <div className="appointment-main">
        <div className="appointment-title-row">
          <h3>{appointment.title}</h3>
          {!isReadOnly && (
            <div className="card-actions">
              <button className="icon-btn" onClick={onEdit} title={t?.edit || "Edit"}>
                <Pencil size={14} />
              </button>
              <button
                className="icon-btn danger-icon"
                onClick={onDelete}
                title={t?.delete || "Delete"}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <p>
          {appointment.doctorName || "Doctor"} · {appointment.specialization || (t?.navAppointments || "Appointment")}
          {appointment.phone ? ` · Tel: ${appointment.phone}` : ""}
        </p>
        <div className="appointment-meta">
          <span>◷ {appointment.time}</span>
          <span>⌖ {appointment.location || appointment.hospital || (t?.locationPlaceholder || "Location not set")}</span>
        </div>
      </div>
      <span className="upcoming-label">{t?.scheduledStatus || "Scheduled"}</span>
    </div>
  );
}
