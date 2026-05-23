/**
 * Optional API key guard for the recommendations route.
 *
 * Set API_SECRET in your environment only for server-to-server usage.
 * Clients must send: Authorization: Bearer <API_SECRET>
 *
 * The public web app does not send this header, so leave API_SECRET unset
 * for browser-facing production deployments unless you add a server-side proxy.
 * If API_SECRET is not set the check is skipped.
 */
export function checkApiSecret(req: Request): Response | null {
  const secret = process.env.API_SECRET;
  if (!secret) return null;

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
