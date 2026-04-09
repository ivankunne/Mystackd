/**
 * Fire-and-forget webhook dispatcher.
 * Call this from the browser after a successful mutation.
 * The actual dispatching (reading DB, calling URLs) happens server-side
 * in /api/webhooks/dispatch.
 */
export async function dispatchWebhook(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (typeof window === "undefined") return; // server-side no-op
  try {
    await fetch("/api/webhooks/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  } catch {
    // Intentionally silent — webhooks are best-effort
  }
}
