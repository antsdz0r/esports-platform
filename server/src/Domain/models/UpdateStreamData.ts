import { StreamPlatform } from "../enums/StreamPlatform";
import { StreamType } from "../enums/StreamType";

export class UpdateStreamData {
  public constructor(
    public readonly platform: StreamPlatform,
    public readonly channel: string,
    public readonly type: StreamType,
    public readonly language: string,
    public readonly title: string | null = null,
    public readonly isActive: boolean = true,
  ) {}
}
