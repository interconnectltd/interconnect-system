import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Public paths that should never trigger an auth redirect.
 * Webhook + cron + public ICS feed + OAuth callback endpoints
 * MUST remain reachable without a Supabase session.
 */
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/line-callback",
  "/api/v1/webhooks/",
  "/api/v1/calendar/cron",
  "/api/v1/calendar/feed/",
  "/api/v1/calendar/callback",
  "/api/v1/calendar/microsoft/callback",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env is missing, skip auth gating to avoid breaking the site;
  // route handlers will still enforce auth via withAuth().
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session cookie on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     * - /api/v1/webhooks/* (third-party webhook signatures handle auth)
     * - /api/v1/calendar/cron (CRON_SECRET handles auth)
     * - /api/v1/calendar/feed/* (token-based public ICS feeds)
     * - /api/v1/calendar/callback, /api/v1/calendar/microsoft/callback (OAuth callbacks use state param)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/v1/webhooks/|api/v1/calendar/cron|api/v1/calendar/feed/|api/v1/calendar/callback|api/v1/calendar/microsoft/callback).*)",
  ],
};
