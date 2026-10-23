import { useState } from "react";
import { HeartHandshake, Plus, Pencil, Trash2, Check, Shield, Phone, Mail, UserCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Modal from "../common/Modal";
import { validatePhone, validateEmail } from "../../utils/validation";

const initialCaregiver = {
  name: "",
  relationship: "Daughter",
  phone: "",
  email: "",
  permissions: {
    medicine: true,
    appointments: true,
    timeline: true,
    alerts: true,
  },
};

export default function CaregiverSection() {
  const { user, updateUser, t, language, transliterateName } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(user?.caregiver || initialCaregiver);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasCaregiver = !!(user?.caregiver && user?.caregiver?.name);

  const openAddModal = () => {
    setForm(initialCaregiver);
    setError("");
    setOpenModal(true);
  };

  const openEditModal = () => {
    setForm(user?.caregiver || initialCaregiver);
    setError("");
    setOpenModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(t?.errNameRequired || "Please enter caregiver full name.");
      return;
    }

    if (form.phone.trim() && !validatePhone(form.phone)) {
      setError(t?.errCaregiverPhoneMinDigits || "Caregiver phone number must contain exactly 10 digits.");
      return;
    }

    if (form.email.trim() && !validateEmail(form.email)) {
      setError(t?.errEmailRequired || "Please enter a valid email address.");
      return;
    }

    updateUser({ caregiver: { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() } });
    setOpenModal(false);
    setMessage(t?.savedSuccessMsg || "Caregiver details updated successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRemove = () => {
    if (window.confirm(t?.removeCaregiverConfirm || "Are you sure you want to disconnect this caregiver? You can add one back anytime.")) {
      updateUser({ caregiver: null });
      setMessage(t?.savedSuccessMsg || "Caregiver removed.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions?.[key],
      },
    }));
  };

  const getRelLabel = (rel) => {
    switch (rel) {
      case "Daughter": return t?.relDaughter || "Daughter";
      case "Son": return t?.relSon || "Son";
      case "Daughter-in-law": return t?.relDaughterInLaw || "Daughter-in-law";
      case "Son-in-law": return t?.relSonInLaw || "Son-in-law";
      case "Spouse": return t?.relSpouse || "Spouse";
      case "Sibling": return t?.relSibling || "Sibling";
      case "Professional Nurse / Caregiver":
      case "Professional Caregiver / Nurse": return t?.relNurse || "Professional Caregiver / Nurse";
      case "Trusted Friend":
      case "Health Partner / Friend": return t?.relHealthPartner || "Health Partner / Friend";
      default: return rel;
    }
  };

  return (
    <div className="caregiver-section-container">
      <div className="settings-section-title">
        <h2>{t?.connectedCaregiverTitle || "Connected Caregiver"}</h2>
        <p>{t?.connectedCaregiverSub || "Manage family members or trusted caregivers who have access to assist you."}</p>
      </div>

      {message && (
        <div className="photo-upload-message success" style={{ marginBottom: "15px" }}>
          <Check size={14} />
          <span>{message}</span>
        </div>
      )}

      {hasCaregiver ? (
        <div className="caregiver-card-detailed">
          <div className="caregiver-header-row">
            <div className="caregiver-avatar-box">
              <HeartHandshake size={24} />
            </div>
            <div className="caregiver-info-main">
              <div className="caregiver-title-flex">
                <h3>{transliterateName ? transliterateName(user.caregiver.name, language) : user.caregiver.name}</h3>
                <span className="pill green">{getRelLabel(user.caregiver.relationship) || "Caregiver"}</span>
              </div>
              <div className="caregiver-contacts">
                {user.caregiver.phone && (
                  <span>
                    <Phone size={12} /> {user.caregiver.phone}
                  </span>
                )}
                {user.caregiver.email && (
                  <span>
                    <Mail size={12} /> {user.caregiver.email}
                  </span>
                )}
              </div>
            </div>

            <div className="caregiver-action-buttons">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={openEditModal}
                title={t?.edit || "Edit Caregiver"}
              >
                <Pencil size={13} />
                <span>{t?.edit || "Edit"}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm danger-btn"
                onClick={handleRemove}
                title={t?.delete || "Remove Caregiver"}
              >
                <Trash2 size={13} />
                <span>{t?.delete || "Remove"}</span>
              </button>
            </div>
          </div>

          <div className="caregiver-permissions-box">
            <span className="permissions-title">
              <Shield size={13} /> {t?.accessPermissions || "Authorized Access Permissions"}:
            </span>
            <div className="permissions-chips">
              <span className={`perm-chip ${user.caregiver.permissions?.medicine ? "enabled" : "disabled"}`}>
                💊 {t?.permMedicine || "Medicine Tracking"}
              </span>
              <span className={`perm-chip ${user.caregiver.permissions?.appointments ? "enabled" : "disabled"}`}>
                📅 {t?.permAppointments || "Doctor Appointments"}
              </span>
              <span className={`perm-chip ${user.caregiver.permissions?.timeline ? "enabled" : "disabled"}`}>
                ⏱️ {t?.permTimeline || "Daily Activity Timeline"}
              </span>
              <span className={`perm-chip ${user.caregiver.permissions?.alerts ? "enabled" : "disabled"}`}>
                🚨 {t?.permAlerts || "Emergency & Adherence Alerts"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="caregiver-empty-card">
          <div className="empty-icon-wrap">
            <HeartHandshake size={28} />
          </div>
          <h3>{t?.noCaregiverLinked || "No Caregiver Added Yet"}</h3>
          <p>
            {t?.noCaregiverConnectedNotice || "Adding a caregiver is completely optional. If added, they can help monitor your medication schedule and appointments."}
          </p>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <Plus size={15} /> {t?.addCaregiverBtn || "Add Caregiver"}
          </button>
        </div>
      )}

      {openModal && (
        <Modal
          title={hasCaregiver ? (t?.editCaregiverBtn || "Edit Caregiver Information") : (t?.addCaregiverBtn || "Add New Caregiver")}
          onClose={() => setOpenModal(false)}
        >
          <form className="stack-form" onSubmit={handleSave}>
            {error && (
              <div className="error-note" style={{ marginBottom: "10px" }}>
                <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                <span>{error}</span>
              </div>
            )}

            <label className="form-field">
              <span className="field-label">{t?.caregiverName || "Caregiver Full Name"} *</span>
              <input
                required
                placeholder={t?.caregiverNamePlaceholder || "Caregiver Name"}
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setError("");
                }}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span className="field-label">{t?.relationship || "Relationship"}</span>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                >
                  <option value="Daughter">{t?.relDaughter || "Daughter"}</option>
                  <option value="Son">{t?.relSon || "Son"}</option>
                  <option value="Daughter-in-law">{t?.relDaughterInLaw || "Daughter-in-law"}</option>
                  <option value="Son-in-law">{t?.relSonInLaw || "Son-in-law"}</option>
                  <option value="Spouse">{t?.relSpouse || "Spouse"}</option>
                  <option value="Sibling">{t?.relSibling || "Sibling"}</option>
                  <option value="Professional Caregiver / Nurse">{t?.relNurse || "Professional Caregiver / Nurse"}</option>
                  <option value="Health Partner / Friend">{t?.relHealthPartner || "Health Partner / Friend"}</option>
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">{t?.caregiverPhone || "Phone Number"}</span>
                <input
                  placeholder={t?.caregiverPhonePlaceholder || "10-digit phone number"}
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    setError("");
                  }}
                />
              </label>
            </div>

            <label className="form-field">
              <span className="field-label">{t?.caregiverEmail || "Email Address"}</span>
              <input
                type="email"
                placeholder={t?.caregiverEmailPlaceholder || "caregiver@example.com"}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setError("");
                }}
              />
            </label>

            <div className="section-box" style={{ marginTop: "10px" }}>
              <div className="section-box-title">
                <Shield size={14} /> {t?.accessPermissions || "Access Permissions"}
              </div>
              <div className="permission-list">
                {[
                  ["medicine", t?.permMedicine || "View medicine status and adherence"],
                  ["appointments", t?.permAppointments || "View and manage doctor appointments"],
                  ["timeline", t?.permTimeline || "View daily memory and activity timeline"],
                  ["alerts", t?.permAlerts || "Receive automated emergency alerts and notifications"],
                ].map(([key, label]) => (
                  <label className="check-row" key={key}>
                    <input
                      type="checkbox"
                      checked={!!form.permissions?.[key]}
                      onChange={() => togglePermission(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpenModal(false)}
              >
                {t?.cancel || "Cancel"}
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={14} /> {t?.save || "Save Caregiver"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
