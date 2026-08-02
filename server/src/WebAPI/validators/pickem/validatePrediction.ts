import { ValidationResult } from "../../../Domain/types/ValidationResult";

// Strana tipa: 1 = team1, 2 = team2. Sve ostalo je nevažeće.
export const validatePrediction = (side: unknown): ValidationResult => {
  if (side !== 1 && side !== 2)
    return { valid: false, message: "Strana tipa mora biti 1 (tim 1) ili 2 (tim 2)" };
  return { valid: true };
};
