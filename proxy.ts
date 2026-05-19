// proxy.ts (formerly middleware.ts)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  '/code(.*)',
  '/conversation(.*)',
  '/dashboard(.*)',
  '/image(.*)',
  '/music(.*)',
  '/settings(.*)',
  '/api/code(.*)',
  '/api/conversation(.*)',
  '/api/image(.*)',
  '/api/music(.*)',
  '/api/stripe(.*)',
  '/api/video(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Ensure this is awaited in newer Clerk versions
  }
});

export const config = {
  // Next.js internal paths and static files are excluded
  matcher: ["/((?!_next|.*\\..*).*)"],
};