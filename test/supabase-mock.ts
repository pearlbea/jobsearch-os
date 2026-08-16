import { vi } from "vitest";

/**
 * A chainable Supabase query builder mock. Every method defaults to
 * returning itself (`mockReturnThis`) so calls like
 * `.select().eq().single()` chain naturally; pass overrides for whichever
 * method actually terminates the chain in a given test.
 */
export function createMockQueryBuilder(overrides: Record<string, unknown> = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

/**
 * A flat Supabase client mock: `auth` plus a single query-builder chain
 * whose methods all return the client itself, so
 * `mockSupabase.from().select().eq().single` and `mockSupabase.from().upsert`
 * both work without nesting. Covers tests that only touch one table per
 * client instance. For tests that dispatch different tables to different
 * builders (e.g. `from.mockImplementation(...)`), reassign `from` and build
 * each branch with `createMockQueryBuilder`.
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    ...createMockQueryBuilder(),
    from: vi.fn().mockReturnThis(),
  };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
