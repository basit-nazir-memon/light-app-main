/** Digits, spaces, and + only (no letters or other punctuation). */
const PHONE_RE = /^\+?[\d\s]*$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerPhone(phone: string): string | null {
  const t = phone.trim();
  if (!t) return null;
  if (!PHONE_RE.test(t)) {
    return "Phone may only contain numbers, spaces, and +";
  }
  return null;
}

export function validateCustomerEmail(email: string): string | null {
  const t = email.trim();
  if (!t) return null;
  if (!EMAIL_RE.test(t)) {
    return "Enter a valid email address";
  }
  return null;
}

export type CustomerContactErrors = {
  phone?: string;
  email?: string;
};

export function validateCustomerContact(
  phone: string,
  email: string,
): CustomerContactErrors {
  const errors: CustomerContactErrors = {};
  const phoneError = validateCustomerPhone(phone);
  const emailError = validateCustomerEmail(email);
  if (phoneError) errors.phone = phoneError;
  if (emailError) errors.email = emailError;
  return errors;
}

export function hasCustomerContactErrors(errors: CustomerContactErrors): boolean {
  return Boolean(errors.phone || errors.email);
}

/** Strip characters that are not digits, spaces, or + while typing. */
export function sanitizeCustomerPhoneInput(value: string): string {
  return value.replace(/[^\d+\s]/g, "");
}
