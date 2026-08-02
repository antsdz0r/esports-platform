// Predikcija pobednika pro meča. predictedSide: 1 = team1, 2 = team2.
// isCorrect: null = neporavnato (meč još nije dobio finalni rezultat), inače 0/1.
export class Prediction {
    constructor(
        public id: number = 0,
        public userId: number = 0,
        public proMatchId: number = 0,
        public predictedSide: number = 0,
        public isCorrect: boolean | null = null,
        public pointsAwarded: number = 0,
        public settledAt: Date | null = null,
        public createdAt: Date | null = null,
    ) {}
}
