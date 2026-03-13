import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getAuthUrl } from "@/lib/google-drive";

/**
 * GET /api/auth/google-drive
 * Redirects to Google OAuth consent screen.
 * Query param: returnUrl (where to redirect after auth)
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returnUrl = request.nextUrl.searchParams.get("returnUrl") || "/settings";
  const state = `${userId}:${returnUrl}`;

  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
