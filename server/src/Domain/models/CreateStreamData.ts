import { StreamPlatform } from "../enums/StreamPlatform";
import { StreamType } from "../enums/StreamType";

export class CreateStreamData {
  public constructor(
    public readonly gameId: number,
    public readonly platform: StreamPlatform,
    public readonly channel: string,
    public readonly type: StreamType,
    public readonly language: string,
    public readonly title: string | null = null,
  ) {}
}
