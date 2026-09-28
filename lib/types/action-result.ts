// Shared Server Action return shape (docs/03-architecture-decisions.md ADR-001,
// docs/04-backend-architecture.md §7) — actions never throw to the client.
// `fieldErrors` (optional, keyed by form field name) lets a form show a server-side
// validation failure under the field it belongs to; `error` still carries a
// one-line message for callers that don't map fields.
export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};
