export function parseData<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && "data" in json) {
    const data = (json as { data: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

export function parseItem<T>(json: unknown): T | null {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data ?? null;
  }
  return (json as T) ?? null;
}
