export class TeamInvite {
  public constructor(
    public readonly id: number = 0,
    public readonly teamId: number = 0,
    public readonly inviterId: number = 0,
    public readonly inviteeId: number = 0,
    public readonly status: "pending" | "accepted" | "declined" = "pending",
    public readonly createdAt: Date = new Date(),
  ) {}
}