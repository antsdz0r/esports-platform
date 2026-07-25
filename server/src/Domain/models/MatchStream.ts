import { StreamPlatform } from "../enums/StreamPlatform";
import { StreamType } from "../enums/StreamType";

export class MatchStream {
    constructor(
        public streamId: number = 0,
        public gameId: number = 0,
        public platform: StreamPlatform = StreamPlatform.TWITCH,
        public channel: string = "",
        public type: StreamType = StreamType.OFFICIAL,
        public language: string = "en",
        public title: string | null = null,
        public isActive: boolean = true,
    ) {}
}
