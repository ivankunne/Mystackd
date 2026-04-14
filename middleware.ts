import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * All top-level directories that are authenticated app routes.
 * Anything NOT in this set (and not a special public path below) is treated
 * as a public /:slug profile page.
 */
const APP_ROUTES = new Set([
  "dashboard",
  "invoices",
  "clients",
  "expenses",
  "connections",
  "contracts",
  "time",
  "projects",
  "proposals",
  "leads",
  "calendar",
  "intelligence",
  "settings",
  "upgrade",
  "referral",
  "reminders",
  "tax",
  "onboarding",
  "portal",
]);

/**
 * Returns true when the path requires an authenticated session.
 *
 * Public paths handled here:
 *   /                     Landing page
 *   /login /signup …      Auth flow
 *   /privacy /terms       Legal pages
 *   /pay/:id              Invoice payment link (shared with clients)
 *   /portal/:token        Client portal (token-based, not session-based)
 *   /contracts/:id/sign   Contract signing by external party
 *   /proposals/:id        Proposal viewed by client
 *   /:slug                Public freelancer earnings page
 *   /api/**               API routes manage their own auth
 *   /_next/** / assets    Framework internals
 */
function needsAuth(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);

  // Root
  if (segments.length === 0) return false;

  const first = segments[0];

  // Framework / CDN internals
  if (first === "_next" || first === "favicon.ico") return false;

  // Static file extensions
  if (/\.(ico|png|jpg|jpeg|gif|svg|webp|webmanifest|js|css|woff2?)$/.test(pathname)) return false;

  // API routes — each handles its own auth
  if (first === "api") return false;

  // Auth / onboarding funnel (allow unauthenticated access so users can reach them)
  if (["login", "signup", "forgot-password", "verify-email"].includes(first)) return false;

  // Legal pages
  if (["privacy", "terms"].includes(first)) return false;

  // Public share / client-facing routes
  if (first === "pay") return false;

  // /portal/:token — client-side portal (public); /portal (no token) — user's own settings → protected
  if (first === "portal" && segments.length > 1) return false;

  // /contracts/:id/sign
  if (first === "contracts" && segments[2] === "sign") return false;

  // /proposals/:id — single proposal viewed by client (two segments only)
  if (first === "proposals" && segments.length === 2) return false;

  // Public /:slug profile pages — single-segment path that is NOT a known app route
  if (segments.length === 1 && !APP_ROUTES.has(first)) return false;

  // Everything else is a protected app route
  return true;
}

export async function middleware(request: NextRequest) {
  // TODO: Re-enable middleware authentication after Vercel Edge Runtime issue is resolved
  // For now, allow all requests to proceed
  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
