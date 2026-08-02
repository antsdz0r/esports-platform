// Bedž koji je korisnik osvojio. Definicija/kriterijum bedža je u kodu
// (Domain/constants/BadgeDefinitions.ts); ovde se pamti samo šta je ko osvojio.
export class UserBadge {
    constructor(
        public id: number = 0,
        public userId: number = 0,
        public badgeCode: string = "",
        public earnedAt: Date | null = null,
    ) {}
}
