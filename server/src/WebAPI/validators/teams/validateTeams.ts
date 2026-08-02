import { ValidationResult } from "../../../Domain/types/ValidationResult";

export const validateTeam = (teamName: string, tag: string, logo?: string): ValidationResult => {
  if (!teamName || teamName.trim().length < 2 || teamName.length > 80)
    return { valid: false, message: "Team name is required (2-80 characters)" };
  if (!tag || !/^[A-Z0-9]{2,6}$/.test(tag))
    return { valid: false, message: "Team tag is invalid or taken (2-6 uppercase letters/numbers)" };
  if (logo && logo.length > 1000)
    return { valid: false, message: "Logo URL je predug" };
  return { valid: true };
};
