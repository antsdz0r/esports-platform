export class ChatMessage {
  public constructor(
    public id: number,
    public matchExternalId: string,
    public userId: number | null,
    public gamerTag: string,
    public message: string,
    public createdAt: Date,
  ) {}
}
