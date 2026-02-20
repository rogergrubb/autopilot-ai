import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Landing page is public
  const isLandingPage = pathname === "/";

  // Public API routes (webhooks, cron, auth)
  const publicApiRoutes = ["/api/auth", "/api/calls/twiml", "/api/cron"];
  const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

  // Landing page: logged-in users go to /app
  if (isLandingPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/app", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isPublicRoute || isPublicApi) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && isPublicRoute) {
      return NextResponse.redirect(new URL("/app", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protect everything else
  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|og-image.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
