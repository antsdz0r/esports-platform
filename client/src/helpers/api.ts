export function parseData<T>(json: object): T[] {
  if (Array.isArray(json)) return json as T[];
  if ("data" in json) {
    const data = (json as { data: object }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

export function parseItem<T>(json: object): T | null {
  if ("data" in json) {
    return (json as { data: T }).data ?? null;
  }
  return (json as T) ?? null;
}
