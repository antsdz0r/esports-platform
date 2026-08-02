import { ChatMessage } from "../../models/ChatMessage";

export interface IChatRepository {
  insert(matchExternalId: string, userId: number, gamerTag: string, message: string): Promise<ChatMessage | null>;
  lastForMatch(matchExternalId: string, limit: number): Promise<ChatMessage[]>;
  deleteById(id: number): Promise<boolean>;
}
