const PHONE_RE = /^\+?[\d\s]*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerContact(phone, email) {
  const errors = [];
  const p = phone == null ? "" : String(phone).trim();
  const e = email == null ? "" : String(email).trim();
  if (p && !PHONE_RE.test(p)) {
    errors.push("Phone may only contain numbers, spaces, and +");
  }
  if (e && !EMAIL_RE.test(e)) {
    errors.push("Enter a valid email address");
  }
  return errors;
}
