export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }

  get invalidSuggestedCodes(): string[] {
    const raw = this.body.invalidSuggestedCodes;
    if (!Array.isArray(raw)) return [];
    return raw.filter((code): code is string => typeof code === "string");
  }
}
