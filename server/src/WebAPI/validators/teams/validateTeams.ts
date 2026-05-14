import { ValidationResult } from "../../../Domain/types/ValidationResult";

export const validateTeam = (teamName: string, tag: string, logo: string): ValidationResult => {
  if (!teamName || teamName.trim().length < 2 || teamName.length > 80)
    return { valid: false, message: "Naziv tima je obavezan (2-80 karaktera)" };
  if (!tag || !/^[A-Z0-9]{2,6}$/.test(tag))
    return { valid: false, message: "Tag tima nije validan ili je zauzet (2-6 velika slova/brojevi)" };
  if (!logo)
    return { valid: false, message: "Logo je obavezan" };
  return { valid: true };
};