import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const signInRoutes = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/verify-2fa",
  "/auth/reset-password",
];

// Public routes that don't require authentication
const publicRoutes = ["/terms", "/privacy"] as string[];

// Just check cookie, recommended approach
export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  const isSignInRoute = signInRoutes.includes(request.nextUrl.pathname);
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(route + "/"),
  );

  if (isSignInRoute && !sessionCookie) {
    return NextResponse.next();
  }

  // Allow public routes without authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!isSignInRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets and api routes
  matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/trpc(.*)"],
};
