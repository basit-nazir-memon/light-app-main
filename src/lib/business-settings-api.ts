import { api } from "./api";
import { company } from "./mockData";

export type BusinessSettings = {
  vatNumber: string;
  email: string;
  phone: string;
};

export const defaultBusinessSettings = (): BusinessSettings => ({
  vatNumber: company.vatNumber,
  email: company.email,
  phone: company.phone,
});

export function fetchBusinessSettings() {
  return api.get<BusinessSettings>("/settings/business");
}

export function saveBusinessSettings(data: BusinessSettings) {
  return api.patch<BusinessSettings>("/settings/business", data);
}
