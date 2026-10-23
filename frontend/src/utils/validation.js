/**
 * Calculates exact age from Date of Birth string (YYYY-MM-DD).
 * Accurately accounts for whether the birthday has already occurred this calendar year.
 */
export function calculateAge(dobString) {
  if (!dobString) return "";
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : "";
}

/**
 * Normalizes phone input by stripping non-digits and standard country prefix (+91 / 91 / 0).
 * Returns the local digit string.
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  // Strip Indian country code +91 / 91 if followed by 10 digits (12 total digits)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Strip leading 0 if 11 total digits
  else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Validates that the local phone number contains EXACTLY 10 numeric digits.
 */
export function validatePhone(phone) {
  if (!phone) return false;
  const digits = normalizePhone(phone);
  return digits.length === 10;
}

export function isValidPhone(phone) {
  return validatePhone(phone);
}

/**
 * Standard email validation regex.
 */
export function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase().trim());
}

/**
 * Validates age according to role-specific criteria:
 * - Elderly: age >= 56 (at least 56 years old)
 * - Caregiver: age >= 23 (greater than 22 years old)
 * - Emergency Contact: age >= 21 (greater than 20 years old)
 * - Young Professional: no elderly restriction
 */
export function validateAgeByRole(age, role = "elderly") {
  const numericAge = Number(age);
  if (!age && age !== 0) {
    return { valid: false, errorKey: "errDobRequired" };
  }

  if (role === "elderly") {
    if (numericAge < 56) {
      return { valid: false, errorKey: "errElderlyAge" };
    }
  } else if (role === "caregiver") {
    if (numericAge < 23) {
      return { valid: false, errorKey: "errCaregiverAge" };
    }
  } else if (role === "emergency_contact") {
    if (numericAge < 21) {
      return { valid: false, errorKey: "errEmergencyContactAge" };
    }
  }

  return { valid: true, errorKey: null };
}

/**
 * Checks whether a contact's normalized phone or email already exists in an array of contacts.
 * When editing, specify currentIndex to allow the contact itself to retain its existing number.
 */
export function isDuplicateContact(contact, existingContacts = [], currentIndex = -1) {
  if (!contact) return false;
  const targetPhone = normalizePhone(contact.phone);
  const targetEmail = (contact.email || "").toLowerCase().trim();

  return existingContacts.some((c, idx) => {
    if (currentIndex >= 0 && idx === currentIndex) return false;
    if (contact.id && c.id && contact.id === c.id) return false;

    const existingPhone = normalizePhone(c.phone);
    const existingEmail = (c.email || "").toLowerCase().trim();

    if (targetPhone && existingPhone && targetPhone === existingPhone) {
      return true;
    }
    if (targetEmail && existingEmail && targetEmail === existingEmail) {
      return true;
    }
    return false;
  });
}

