/**
 * Simple API key guard for the recommendations route.
 *
 * Set API_SECRET in your environment (Vercel dashboard or .env.local).
 * Clients must send:  Authorization: Bearer <API_SECRET>
 *
 * If API_SECRET is not set the check is skipped — safe for local dev,
 * not safe for public production. Set the env var before deploying.
 */
export function checkApiSecret(req: Request): Response | null {
  const secret = process.env.API_SECRET;
  if (!secret) return null; // not configured — allow through

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}
