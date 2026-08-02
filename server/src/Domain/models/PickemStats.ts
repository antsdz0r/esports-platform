// Agregirana pick'em statistika jednog korisnika (izvor rang liste + streak/bedževi).
// userId = 0 je sentinel "ne postoji" (nula-red za korisnika bez ijedne poravnate predikcije).
export class PickemStats {
    constructor(
        public userId: number = 0,
        public totalPoints: number = 0,
        public totalPredictions: number = 0,
        public correctPredictions: number = 0,
        public currentStreak: number = 0,
        public bestStreak: number = 0,
    ) {}
}
