import { ValidationResult } from "../../../Domain/types/ValidationResult";

export const validateTournament = (
  name: string, format: string, maxTeams: number, registrationDeadline: Date
): ValidationResult => {
  if (!name || name.trim().length < 3 || name.length > 120)
    return { valid: false, message: "Tournament name is required (3-120 characters)" };
  const validFormats = ["single_elim", "double_elim", "round_robin"];
  if (!validFormats.includes(format))
    return { valid: false, message: "Choose a valid format" };
  const elimFormats = ["single_elim", "double_elim"];
  if (elimFormats.includes(format)) {
    if (maxTeams < 4 || maxTeams > 256 || (maxTeams & (maxTeams - 1)) !== 0)
      return { valid: false, message: "Number of teams must be a power of 2 (4, 8, 16...)" };
  }
  if (registrationDeadline <= new Date())
    return { valid: false, message: "Registration deadline must be in the future" };
  return { valid: true };
};