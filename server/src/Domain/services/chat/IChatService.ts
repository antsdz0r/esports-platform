import { ChatMessageDto } from "../../DTOs/chat/ChatMessageDto";

export interface ChatPostResult {
  ok: boolean;
  message?: ChatMessageDto;
  error?: string;
}

export interface IChatService {
  history(matchExternalId: string, limit: number): Promise<ChatMessageDto[]>;
  post(matchExternalId: string, userId: number, gamerTag: string, text: string): Promise<ChatPostResult>;
  deleteMessage(id: number): Promise<boolean>;
}
