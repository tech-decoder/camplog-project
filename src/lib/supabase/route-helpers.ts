import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "./auth-helper";
import { getApiKeyUserId } from "./api-key-auth";

/**
 * Resolve the authenticated user ID from either session cookie or API key header.
 * Returns null if neither is valid.
 */
export async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

/**
 * Parse the JSON body of a request.
 * Returns a 400 response if the body is not valid JSON.
 */
export async function parseJsonBody(
  request: NextRequest
): Promise<{ body: Record<string, unknown> } | NextResponse> {
  try {
    const body = await request.json();
    return { body };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
