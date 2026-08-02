export class ChatMessageDto {
  public constructor(
    public id: number,
    public userId: number | null,
    public gamerTag: string,
    public message: string,
    public createdAt: string,
  ) {}
}
