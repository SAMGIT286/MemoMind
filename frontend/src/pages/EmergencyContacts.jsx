import { Plus, Trash2, AlertCircle } from "lucide-react";
import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { validatePhone, validateEmail, normalizePhone } from "../utils/validation";

const blankContact = { name: "", relationship: "Daughter", phone: "", email: "" };

export default function EmergencyContacts() {
  const { user, updateUser, t } = useAuth();

  const [contacts, setContacts] = useState(() => {
    if (user?.emergencyContacts && user.emergencyContacts.length > 0) {
      return user.emergencyContacts;
    }
    return [{ ...blankContact }];
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.emergencyContacts && user.emergencyContacts.length > 0) {
      setContacts(user.emergencyContacts);
    }
  }, [user]);

  const update = (index, key, value) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [key]: value } : c))
    );
    setError("");
  };

  const addContact = () => {
    setContacts((p) => [...p, { ...blankContact }]);
  };

  const removeContact = (index) => {
    if (contacts.length > 1) {
      setContacts((prev) => prev.filter((_, i) => i !== index));
      setError("");
    }
  };

  const handleNext = () => {
    setError("");

    // 1. Validate Contact 1 (Primary)
    const primary = contacts[0];
    if (!primary || !primary.name.trim()) {
      setError(t?.errContactNameRequired || "Please provide a name for the primary contact.");
      return false;
    }

    if (!validatePhone(primary.phone)) {
      setError(t?.errContactPhoneRequired || "Primary contact phone number must contain exactly 10 digits.");
      return false;
    }

    if (primary.email && !validateEmail(primary.email)) {
      setError(t?.errEmailRequired || "Please enter a valid email address.");
      return false;
    }

    // 2. Validate any additional filled contacts
    for (let i = 1; i < contacts.length; i++) {
      const c = contacts[i];
      if (c.name.trim() || c.phone.trim()) {
        if (!c.name.trim()) {
          setError(`Please provide a name for Contact ${i + 1}.`);
          return false;
        }
        if (!validatePhone(c.phone)) {
          setError(`Contact ${i + 1} phone number must contain exactly 10 digits.`);
          return false;
        }
        if (c.email && !validateEmail(c.email)) {
          setError(`Contact ${i + 1} email is invalid.`);
          return false;
        }
      }
    }

    // 3. Duplicate Contact Prevention (using normalized phone & email)
    const activeContacts = contacts.filter((c, i) => i === 0 || c.name.trim() || c.phone.trim());

    for (let i = 0; i < activeContacts.length; i++) {
      const phoneI = normalizePhone(activeContacts[i].phone);
      const emailI = (activeContacts[i].email || "").toLowerCase().trim();

      for (let j = 0; j < i; j++) {
        const phoneJ = normalizePhone(activeContacts[j].phone);
        const emailJ = (activeContacts[j].email || "").toLowerCase().trim();

        if (phoneI && phoneJ && phoneI === phoneJ) {
          setError(t?.errContactDuplicate || "Emergency contact already exists.");
          return false;
        }
        if (emailI && emailJ && emailI === emailJ) {
          setError(t?.errContactDuplicate || "Emergency contact already exists.");
          return false;
        }
      }
    }

    // Clean up any empty extra contacts
    const cleanedContacts = activeContacts.map((c, idx) => ({
      id: c.id || `contact-${Date.now()}-${idx}`,
      name: c.name.trim(),
      relationship: c.relationship,
      phone: c.phone.trim(),
      email: c.email.trim(),
    }));

    // Save to user context & localStorage
    updateUser({ emergencyContacts: cleanedContacts });
    return true;
  };

  return (
    <OnboardingLayout
      step={3}
      title={t?.emergencyTitle || "Emergency Contacts"}
      subtitle={t?.emergencySubtitle || "Add at least one trusted emergency contact."}
      backTo="/onboarding/personal-details"
      nextTo="/onboarding/caregiver-details"
      nextAction={handleNext}
    >
      {error && (
        <div className="error-note" style={{ marginBottom: "16px" }}>
          <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          <span>{error}</span>
        </div>
      )}

      <div className="contact-stack">
        {contacts.map((contact, index) => (
          <div className="section-box" key={index}>
            <div className="section-box-title">
              <span>
                {t?.contactNum ? t.contactNum(index + 1) : `Contact ${index + 1}`}{" "}
                {index === 0 && <span className="pill green">{t?.primaryBadge || "Primary"}</span>}
              </span>
              {contacts.length > 1 && (
                <button
                  type="button"
                  className="icon-btn danger-icon"
                  style={{ marginLeft: "auto", width: "24px", height: "24px" }}
                  onClick={() => removeContact(index)}
                  title="Remove contact"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span className="field-label">{t?.contactName || "Name"} *</span>
                <input
                  value={contact.name}
                  onChange={(e) => update(index, "name", e.target.value)}
                  placeholder={t?.contactNamePlaceholder || "Contact Name"}
                  required={index === 0}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.relationship || "Relationship"}</span>
                <select
                  value={contact.relationship}
                  onChange={(e) => update(index, "relationship", e.target.value)}
                >
                  <option value="Daughter">{t?.relDaughter || "Daughter"}</option>
                  <option value="Son">{t?.relSon || "Son"}</option>
                  <option value="Spouse">{t?.relSpouse || "Spouse"}</option>
                  <option value="Friend">{t?.relFriend || "Friend"}</option>
                  <option value="Sibling">{t?.relSibling || "Sibling"}</option>
                  <option value="Colleague">{t?.relColleague || "Colleague"}</option>
                  <option value="Neighbor">{t?.relNeighbor || "Neighbor"}</option>
                  <option value="Other">{t?.relOther || "Other"}</option>
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">{t?.contactPhone || "Phone Number"} *</span>
                <input
                  value={contact.phone}
                  onChange={(e) => update(index, "phone", e.target.value)}
                  placeholder={t?.contactPhonePlaceholder || "98765 43210"}
                  required={index === 0}
                />
              </label>

              <label className="form-field">
                <span className="field-label">{t?.contactEmail || "Email (optional)"}</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => update(index, "email", e.target.value)}
                  placeholder={t?.contactEmailPlaceholder || "contact@example.com"}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-light-green"
        style={{ marginTop: "12px" }}
        onClick={addContact}
      >
        <Plus size={15} /> {t?.addAnotherContact || "Add Another Contact"}
      </button>
    </OnboardingLayout>
  );
}
