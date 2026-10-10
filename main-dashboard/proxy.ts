import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define exactly which routes require authentication
const isProtectedRoute = createRouteMatcher([
  "/api-keys(.*)", 
  "/(.*)", 
  "/integrations(.*)",
  "/live-logs(.*)",
  "/queries(.*)",
  "/settings(.*)",
  "/alerts(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // If it's a protected route, enforce authentication
  if (isProtectedRoute(req)) {
    // This automatically handles the redirect to your Clerk sign-in URL 
    // and prevents infinite loops on public pages like localhost:3000/
    await auth.protect(); 
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};