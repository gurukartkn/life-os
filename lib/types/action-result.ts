// Shared Server Action return shape (docs/03-architecture-decisions.md ADR-001,
// docs/04-backend-architecture.md §7) — actions never throw to the client.
export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};
