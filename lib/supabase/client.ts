import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

// Browser Supabase client — client components only (docs/04-backend-architecture.md §1).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
