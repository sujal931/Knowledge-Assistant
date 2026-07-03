import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const protectedRoutes = ["/chat", "/documents", "/dashboard", "/admin", "/onboarding"];
const authRoutes = ["/login"];

export default async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Redirect to onboarding if no organization
  if (
    isProtectedRoute &&
    session &&
    !session.user.organizationId &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
