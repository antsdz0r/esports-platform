import { ValidationResult } from "../../../Domain/types/ValidationResult";

export const validateMatchScore = (score: string): ValidationResult => {
  if (!score || !/^\d+:\d+$/.test(score))
    return { valid: false, message: "Enter a valid result (e.g. 2:0)" };
  const [a, b] = score.split(":").map(Number);
  if (a === b)
    return { valid: false, message: "The winner must be clear (the result can't be a tie)" };
  return { valid: true };
};