import { TeamMemberRole } from "../enums/TeamMemberRole";

export class TeamMember{
    constructor(
        public TeamId : number = 0,
        public playerId : number = 0,
        public role : TeamMemberRole = TeamMemberRole.MEMBER,
        public joinedAt: Date = new Date(),
    ){}
}