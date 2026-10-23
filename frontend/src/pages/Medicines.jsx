import { MoreVertical, Plus, Pill, Trash2, Pencil, Check } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/common/Modal";
import RoleBadge from "../components/common/RoleBadge";
import ReadOnlyBanner from "../components/common/ReadOnlyBanner";

const empty = {
  name: "",
  dosage: "1 tablet",
  frequency: "Once daily",
  time: "08:00",
  startDate: "",
  endDate: "",
  reminderEnabled: true,
  notes: "",
};

export default function Medicines() {
  const {
    medicines = [],
    localizedMedicines = [],
    addMedicine,
    updateMedicine,
    deleteMedicine,
    markMedicineTaken,
  } = useApp();
  const { user, userDisplayName, role, isReadOnly, isEmergencyContact, transliterateName, t } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const medsToRender = localizedMedicines.length ? localizedMedicines : medicines;

  const openAdd = () => {
    if (isReadOnly) return;
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (m) => {
    if (isReadOnly) return;
    // Always edit original record so original content is preserved
    const orig = medicines.find((item) => item.id === m.id) || m;
    setEditing(orig.id);
    setForm({ ...orig, time: to24(orig.time) });
    setOpen(true);
  };

  const save = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!form.name.trim()) return;

    const data = { ...form, time: formatTime(form.time) };
    editing ? updateMedicine(editing, data) : addMedicine(data);
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
          <div className="eyebrow">{t?.medicationsRemindersEyebrow || "MEDICATIONS & REMINDERS"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.navMedicines || "Medicines"}</h1>
            <RoleBadge role={role} />
          </div>
          <p>
            {isEmergencyContact
              ? (t?.viewingActiveMedPlan ? t.viewingActiveMedPlan(patientName) : `Viewing active medication plan for ${patientName}.`)
              : (t?.managePrescriptionsDesc || "Manage your daily prescriptions, supplements, and timing reminders.")}
          </p>
        </div>

        {!isReadOnly && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> {t?.addMedicine || "Add Medicine"}
          </button>
        )}
      </div>

      <div className="tabs">
        <button className="tab active">
          {t?.activePrescriptionsCount ? t.activePrescriptionsCount(medsToRender.length) : `Active Prescriptions (${medsToRender.length})`}
        </button>
      </div>

      <div className="medicine-list">
        {medsToRender.map((m) => (
          <MedicineRow
            key={m.id}
            medicine={m}
            isReadOnly={isReadOnly}
            t={t}
            onTaken={markMedicineTaken}
            onEdit={() => openEdit(m)}
            onDelete={() => deleteMedicine(m.id)}
          />
        ))}
      </div>

      {!medsToRender.length && (
        <div className="panel empty-state">{t?.noMedicinesYet || "No medicines or supplements registered yet."}</div>
      )}

      {open && !isReadOnly && (
        <Modal
          title={editing ? (t?.editMedicineTitle || "Edit Medicine Details") : (t?.addMedicineTitle || "Add New Medicine")}
          onClose={() => setOpen(false)}
        >
          <form className="stack-form" onSubmit={save}>
            <label className="form-field">
              <span className="field-label">{t?.medicineNameLabel || "Medicine Name *"}</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t?.medicineNamePlaceholder || "e.g. Daily Vitamin / Prescription"}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span className="field-label">{t?.dosageLabel || "Dosage"}</span>
                <input
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder={t?.dosagePlaceholder || "e.g. 1 tablet (5mg)"}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.frequencyLabel || "Frequency"}</span>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                >
                  <option value="Once daily">{t?.freqOnceDaily || "Once daily"}</option>
                  <option value="Twice daily">{t?.freqTwiceDaily || "Twice daily"}</option>
                  <option value="Three times daily">{t?.freqThriceDaily || "Three times daily"}</option>
                  <option value="Weekly">{t?.freqWeekly || "Weekly"}</option>
                  <option value="As needed (SOS)">{t?.freqAsNeeded || "As needed (SOS)"}</option>
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">{t?.timeLabel || "Time"}</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.startDateLabel || "Start Date"}</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.endDateLabel || "End Date (optional)"}</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.reminderEnabled}
                onChange={(e) =>
                  setForm({ ...form, reminderEnabled: e.target.checked })
                }
              />
              <span>{t?.enableAudioNotifications || "Enable audio & notification reminders"}</span>
            </label>

            <label className="form-field">
              <span className="field-label">{t?.doctorInstructionsLabel || "Doctor's Instructions / Notes"}</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows="3"
                placeholder={t?.doctorInstructionsPlaceholder || "e.g. Take after breakfast with water"}
              />
            </label>

            <button className="btn btn-primary btn-full" type="submit">
              <Pill size={16} /> {editing ? (t?.saveChanges || "Save Changes") : (t?.saveMedicineBtn || "Save Medicine")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function MedicineRow({ medicine, isReadOnly, t, onTaken, onEdit, onDelete }) {
  const formatFreq = (freq) => {
    switch (freq) {
      case "Once daily": return t?.freqOnceDaily || freq;
      case "Twice daily": return t?.freqTwiceDaily || freq;
      case "Three times daily": return t?.freqThriceDaily || freq;
      case "Weekly": return t?.freqWeekly || freq;
      case "As needed (SOS)": return t?.freqAsNeeded || freq;
      default: return freq;
    }
  };

  return (
    <div className="medicine-card">
      <div className={`medicine-icon ${medicine.status === "taken" ? "taken" : ""}`}>
        <Pill size={20} />
      </div>
      <div className="medicine-main">
        <div className="medicine-title-row">
          <h3>{medicine.name}</h3>
          {!isReadOnly && (
            <div className="card-actions">
              <button className="icon-btn" onClick={onEdit} title={t?.edit || "Edit"}>
                <Pencil size={14} />
              </button>
              <button
                className="icon-btn danger-icon"
                onClick={() =>
                  window.confirm(t?.confirmDeleteMedicine ? t.confirmDeleteMedicine(medicine.name) : `Delete ${medicine.name}?`) && onDelete()
                }
                title={t?.delete || "Delete"}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <p>
          {medicine.dosage} · {formatFreq(medicine.frequency)}
          {medicine.notes ? ` · (${medicine.notes})` : ""}
        </p>
        <div className="medicine-meta">◷ {t?.scheduledAt || "Scheduled:"} {medicine.time}</div>
      </div>

      <div className="medicine-status">
        {medicine.status === "taken" ? (
          <span className="status-pill success">
            <Check size={12} /> {t?.takenAtPrefix || "Taken at"} {medicine.takenAt || medicine.time}
          </span>
        ) : isReadOnly ? (
          <span className="status-pill warning" style={{ background: "#fff6e6", color: "#b37400" }}>
            {t?.scheduledStatus || "Scheduled"}
          </span>
        ) : (
          <button className="mini-btn" onClick={() => onTaken(medicine.id)}>
            {t?.markAsTaken || "Mark as Taken"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function to24(value) {
  if (!value || value.includes("T")) return value;
  const d = new Date(`2000-01-01 ${value}`);
  return Number.isNaN(d.getTime())
    ? "08:00"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
