const ADMIN_PROFILE_KEY = "yova-admin-profile";

export type AdminProfileSettings = {
  fullName: string;
  email: string;
};

export function loadAdminProfile(fallback: AdminProfileSettings): AdminProfileSettings {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as AdminProfileSettings;
    return {
      fullName: parsed.fullName ?? fallback.fullName,
      email: parsed.email ?? fallback.email,
    };
  } catch {
    return fallback;
  }
}

export function saveAdminProfile(profile: AdminProfileSettings) {
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
}
