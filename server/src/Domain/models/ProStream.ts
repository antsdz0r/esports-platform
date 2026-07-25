import { StreamPlatform } from "../enums/StreamPlatform";

export class ProStream {
    constructor(
        public id: number = 0,
        public proMatchId: number = 0,
        public platform: StreamPlatform = StreamPlatform.TWITCH,
        public channel: string = "",
        public language: string = "en",
        public isOfficial: boolean = true,
        public source: string = "pandascore",
    ) {}
}
