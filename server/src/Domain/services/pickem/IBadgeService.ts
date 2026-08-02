export interface IBadgeService {
  // Proveri sve definicije bedža za korisnika i dodeli one koje ispunjava a još nema.
  // Vraća kodove tek osvojenih bedževa.
  evaluateForUser(userId: number): Promise<string[]>;
}
