import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode } from "@/lib/google-drive";

/**
 * GET /api/auth/google-drive/callback
 * Google redirects here after user consents.
 * Exchanges code for tokens, stores refresh_token in profile.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    // User denied access
    const returnUrl = state?.split(":").slice(1).join(":") || "/settings";
    return NextResponse.redirect(new URL(`${returnUrl}?drive=denied`, request.url));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Parse state: userId:returnUrl
  const colonIndex = state.indexOf(":");
  const userId = state.substring(0, colonIndex);
  const returnUrl = state.substring(colonIndex + 1) || "/settings";

  if (!userId) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      // This happens if user already authorized before — redirect with warning
      return NextResponse.redirect(
        new URL(`${returnUrl}?drive=no_refresh_token`, request.url)
      );
    }

    // Store refresh token in profile
    const supabase = createAdminClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        google_drive_refresh_token: tokens.refresh_token,
        google_drive_connected_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Failed to store Drive token:", dbError);
      return NextResponse.redirect(
        new URL(`${returnUrl}?drive=error`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL(`${returnUrl}?drive=connected`, request.url)
    );
  } catch (err) {
    console.error("Drive OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`${returnUrl}?drive=error`, request.url)
    );
  }
}
