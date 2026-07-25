import { ValidationResult } from "../../../Domain/types/ValidationResult";
import { StreamPlatform } from "../../../Domain/enums/StreamPlatform";
import { StreamType } from "../../../Domain/enums/StreamType";

// Kanal / video id ide direktno u embed URL zvanicnog plejera na klijentu,
// pa dozvoljavamo samo bezbedne karaktere (bez razmaka, navodnika, < > itd.)
// cime sprecavamo injection u iframe src.
const CHANNEL_PATTERN = /^[A-Za-z0-9_\-.]{1,200}$/;
const LANGUAGE_PATTERN = /^[A-Za-z-]{2,10}$/;

export const validateStream = (
  platform: string, channel: string, type: string, language: string, title: string | null
): ValidationResult => {
  const validPlatforms: string[] = [StreamPlatform.TWITCH, StreamPlatform.YOUTUBE, StreamPlatform.KICK];
  if (!validPlatforms.includes(platform))
    return { valid: false, message: "Izaberite validnu platformu (twitch, youtube, kick)" };

  if (!channel || !CHANNEL_PATTERN.test(channel.trim()))
    return { valid: false, message: "Kanal je obavezan (dozvoljena slova, brojevi, _ - .)" };

  const validTypes: string[] = [StreamType.OFFICIAL, StreamType.COCAST, StreamType.CASTER];
  if (!validTypes.includes(type))
    return { valid: false, message: "Izaberite validan tip streama" };

  if (!language || !LANGUAGE_PATTERN.test(language.trim()))
    return { valid: false, message: "Jezik mora biti kod od 2-10 slova (npr. en, sr)" };

  if (title != null && title.length > 150)
    return { valid: false, message: "Naslov može imati najviše 150 karaktera" };

  return { valid: true };
};
