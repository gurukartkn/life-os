import { vi } from "vitest";

// Test-only helpers for mocking `@/lib/supabase/server`'s createClient() in
// Server Action unit tests, since every action chains `.from(...).eq(...)`
// etc. and awaits the result. Usage:
//
//   vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
//   const mockedCreateClient = vi.mocked(createClient);
//   const supabase = makeSupabaseMock();
//   mockedCreateClient.mockResolvedValue(supabase as unknown as SupabaseLike);
//   supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));
//
// Each `.from()` call is queued independently via `mockReturnValueOnce`, so
// actions that issue several sequential or parallel calls (e.g. a
// maybeSingle() lookup followed by an insert/update, or Promise.all across
// tables) can be given a distinct result per call, in call order.

export type SupabaseResult<T = unknown> = {
  data: T | null;
  error: unknown;
  count?: number | null;
};

export function queryResult<T>(
  data: T | null,
  error: unknown = null,
  count: number | null = null
): SupabaseResult<T> {
  return { data, error, count };
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "in",
  "gte",
  "lte",
  "order",
  "limit",
] as const;

export type QueryBuilderMock = {
  [K in (typeof CHAIN_METHODS)[number]]: ReturnType<typeof vi.fn>;
} & {
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: Promise<unknown>["then"];
  catch: Promise<unknown>["catch"];
};

// A chainable, thenable fake query builder. Every chain method returns the
// builder itself; awaiting it (or calling `.single()`/`.maybeSingle()` and
// then awaiting) resolves to `result`.
export function makeQueryBuilder(result: SupabaseResult = { data: null, error: null }): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => builder);
  builder.then = ((onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)) as Promise<unknown>["then"];
  builder.catch = ((onRejected) => Promise.resolve(result).catch(onRejected)) as Promise<unknown>["catch"];

  return builder;
}

// A query that never settles. Lets a test prove that several reads were *issued*
// together (all `from()` calls happen before any result comes back) — i.e. that a
// page runs its independent queries in parallel rather than one after another.
export function makePendingQueryBuilder(): QueryBuilderMock {
  const builder = makeQueryBuilder();
  const pending = new Promise(() => {});
  builder.then = pending.then.bind(pending) as Promise<unknown>["then"];
  builder.catch = pending.catch.bind(pending) as Promise<unknown>["catch"];
  return builder;
}

export type SupabaseAuthUser = { id: string; email?: string } | null;

export type SupabaseMock = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

export function makeSupabaseMock({
  user = { id: "user-1", email: "user@example.com" },
  authError = null,
}: {
  user?: SupabaseAuthUser;
  authError?: unknown;
} = {}): SupabaseMock {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(),
  };
}
