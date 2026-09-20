import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];

// Refreshes the Supabase session cookie on every request and guards
// authenticated routes (docs/04-backend-architecture.md §3).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the session's JWT locally against the project's cached
  // signing keys instead of asking Supabase Auth over the network on every
  // request (getUser() cost one round trip before anything could render).
  // An expired access token is still refreshed here, which is what keeps the
  // cookie current. Trade-off: a session revoked elsewhere is honoured until
  // its access token expires (≤ 1 hour); Server Actions that write still call
  // getUser(), and RLS is the real boundary either way (ADR-002).
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!isSignedIn && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isSignedIn && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/todos";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
