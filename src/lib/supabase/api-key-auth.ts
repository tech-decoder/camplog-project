import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "./admin";

/**
 * Hash an API key using SHA-256.
 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate a request using an API key from the Authorization header.
 * Returns the user_id if valid, or null.
 */
export async function getApiKeyUserId(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith("cl_")) return null;

  const keyHash = hashKey(token);
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!data) return null;

  // Fire-and-forget last_used_at update
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then();

  return data.user_id;
}

/**
 * Generate a new API key. Returns the plaintext key (shown once) and its hash + prefix for storage.
 */
export function generateApiKey(): {
  plaintextKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const random = randomBytes(20).toString("hex"); // 40 hex chars
  const plaintextKey = `cl_${random}`;
  const keyHash = hashKey(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, 10) + "...";

  return { plaintextKey, keyHash, keyPrefix };
}
