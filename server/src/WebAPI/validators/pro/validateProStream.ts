import { ValidationResult } from "../../../Domain/types/ValidationResult";
import { StreamPlatform } from "../../../Domain/enums/StreamPlatform";

// Kanal / video id ide direktno u embed URL zvanicnog plejera na klijentu,
// pa dozvoljavamo samo bezbedne karaktere (bez razmaka, navodnika, < > itd.)
// cime sprecavamo injection u iframe src.
const CHANNEL_PATTERN = /^[A-Za-z0-9_\-.]{1,200}$/;
const LANGUAGE_PATTERN = /^[A-Za-z-]{2,10}$/;

export const validateProStream = (
  platform: string, channel: string, language: string
): ValidationResult => {
  const validPlatforms: string[] = [StreamPlatform.TWITCH, StreamPlatform.YOUTUBE, StreamPlatform.KICK];
  if (!validPlatforms.includes(platform))
    return { valid: false, message: "Choose a valid platform (twitch, youtube, kick)" };

  if (!channel || !CHANNEL_PATTERN.test(channel.trim()))
    return { valid: false, message: "Channel is required (letters, numbers, _ - . allowed)" };

  if (!language || !LANGUAGE_PATTERN.test(language.trim()))
    return { valid: false, message: "Language must be a 2-10 letter code (e.g. en, sr)" };

  return { valid: true };
};
