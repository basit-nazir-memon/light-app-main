import fs from "fs";
import path from "path";
import { getDataDir } from "./db.js";
import { validateCustomerContact } from "./customer-validation.js";

const SETTINGS_FILE = "business-settings.json";

const DEFAULTS = {
  vatNumber: "GB 123 4567 89",
  email: "hello@yovaauto.co.uk",
  phone: "+44 161 555 0199",
};

function settingsPath() {
  return path.join(getDataDir(), SETTINGS_FILE);
}

export function loadBusinessSettings() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      vatNumber: String(parsed.vatNumber ?? DEFAULTS.vatNumber).trim(),
      email: String(parsed.email ?? DEFAULTS.email).trim(),
      phone: String(parsed.phone ?? DEFAULTS.phone).trim(),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveBusinessSettings(partial) {
  const current = loadBusinessSettings();
  const next = {
    vatNumber:
      partial.vatNumber !== undefined
        ? String(partial.vatNumber).trim()
        : current.vatNumber,
    email:
      partial.email !== undefined ? String(partial.email).trim() : current.email,
    phone:
      partial.phone !== undefined ? String(partial.phone).trim() : current.phone,
  };
  const errors = validateCustomerContact(next.phone, next.email);
  if (errors.length) {
    const err = new Error(errors[0]);
    err.status = 400;
    throw err;
  }
  if (!next.vatNumber || !next.email || !next.phone) {
    const err = new Error("VAT number, email, and phone are all required");
    err.status = 400;
    throw err;
  }
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
