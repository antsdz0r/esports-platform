export class AuditLog {
  public constructor(
    public readonly id: number = 0,
    public readonly userId: number | null = null,
    public readonly action: string = "",
    public readonly entity: string | null = null,
    public readonly entityId: number | null = null,
    public readonly description: string | null = null,
    public readonly ipAddress: string | null = null,
    public readonly createdAt: Date = new Date(),
  ) {}
}