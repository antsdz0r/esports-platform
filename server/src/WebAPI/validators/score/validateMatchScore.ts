import { ValidationResult } from "../../../Domain/types/ValidationResult";

export const validateMatchScore = (score: string): ValidationResult => {
  if (!score || !/^\d+:\d+$/.test(score))
    return { valid: false, message: "Unesite validan rezultat (npr. 2:0)" };
  const [a, b] = score.split(":").map(Number);
  if (a === b)
    return { valid: false, message: "Pobednik mora biti jasan (rezultat ne može biti neodlučen)" };
  return { valid: true };
};