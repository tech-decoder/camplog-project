import { createClient } from "./server";

/**
 * Get the authenticated user's ID from the request cookies.
 * Returns the user ID string, or null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
