import { IChatService, ChatPostResult } from "../../Domain/services/chat/IChatService";
import { IChatRepository } from "../../Domain/repositories/chat/IChatRepository";
import { ChatMessage } from "../../Domain/models/ChatMessage";
import { ChatMessageDto } from "../../Domain/DTOs/chat/ChatMessageDto";

const MAX_LEN = 500;

export class ChatService implements IChatService {
  public constructor(
    private readonly repo: IChatRepository,
  ) {}

  private toDto(m: ChatMessage): ChatMessageDto {
    return new ChatMessageDto(m.id, m.userId, m.gamerTag, m.message, m.createdAt.toISOString());
  }

  async history(matchExternalId: string, limit: number): Promise<ChatMessageDto[]> {
    const rows = await this.repo.lastForMatch(matchExternalId, limit);
    return rows.map((m) => this.toDto(m));
  }

  async post(matchExternalId: string, userId: number, gamerTag: string, text: string): Promise<ChatPostResult> {
    // Sanitizacija: spoji sav whitespace (i nove redove/tabove) u jedan razmak, trim, ogranici duzinu.
    // (XSS nije problem jer klijent renderuje kao tekst; React auto-escape-uje.)
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length === 0) return { ok: false, error: "Prazna poruka" };
    if (clean.length > MAX_LEN) return { ok: false, error: `Najvise ${MAX_LEN} karaktera` };

    const saved = await this.repo.insert(matchExternalId, userId, gamerTag, clean);
    if (!saved) return { ok: false, error: "Neuspesno slanje" };
    return { ok: true, message: this.toDto(saved) };
  }

  deleteMessage(id: number): Promise<boolean> {
    return this.repo.deleteById(id);
  }
}
