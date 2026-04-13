import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  /** Routes under (dashboard)/layout — must match real URLs (route group is not in path). */
  const PROTECTED_PREFIXES = [
    "/dashboard",
    "/chat",
    "/properties",
    "/clients",
    "/leads",
    "/reports",
    "/monitoring",
    "/settings",
  ] as const;

  const needsAuth = PROTECTED_PREFIXES.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );

  const isAuthEntry =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAuthCallback =
    pathname.startsWith("/callback") || pathname.startsWith("/auth/callback");

  // Unauthenticated → redirect to login
  if (!user && needsAuth) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → redirect away from login / register
  if (user && isAuthEntry) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // Allow auth callback to pass through
  if (isAuthCallback) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
