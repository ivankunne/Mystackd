"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, Copy, Check, ExternalLink, Settings, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getClients } from "@/lib/data/clients";
import { getAllPortals, savePortal } from "@/lib/data/portal";
import { useAuth } from "@/lib/context/AuthContext";
import type { Client, ClientPortal } from "@/lib/mock-data";

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  loading,
}: {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      title={checked ? "Deactivate portal" : "Activate portal"}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
      style={{ background: checked ? "#22C55E" : "var(--border-col)" }}
    >
      <span
        className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ─── Generate a URL-safe portal token ─────────────────────────────────────────
function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PortalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [portals, setPortals] = useState<ClientPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    Promise.all([getClients(user.id), getAllPortals()]).then(([clientData, portalData]) => {
      if (mounted) { setClients(clientData); setPortals(portalData); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleToggle = async (client: Client, existing: ClientPortal | undefined) => {
    setToggling(client.id);
    try {
      const freelancerName =
        (user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name ??
        user?.email?.split("@")[0] ??
        "Freelancer";

      const next: ClientPortal = existing
        ? { ...existing, isEnabled: !existing.isEnabled }
        : {
            clientId:      client.id,
            token:         makeToken(),
            isEnabled:     true,
            freelancerName,
            allowFeedback: true,
            showInvoices:  true,
            showFiles:     true,
            showUpdates:   true,
          };

      const saved = await savePortal(next);
      setPortals((prev) => {
        const without = prev.filter((p) => p.clientId !== client.id);
        return [...without, saved];
      });
    } finally {
      setToggling(null);
    }
  };

  const portalsWithClients = clients.map((client) => {
    const portal = portals.find((p) => p.clientId === client.id);
    return { client, portal };
  });

  const activeCount = portals.filter((p) => p.isEnabled).length;

  return (
    <AppShell title="Client Portals">
      <div className="p-5 lg:p-6 space-y-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Share a unique link with each client — they can view invoices, approve proposals,
            sign contracts, and leave feedback without creating an account.
          </p>
          {activeCount > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: "#22C55E20", color: "#22C55E" }}
            >
              {activeCount} active
            </span>
          )}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {clients.length === 0 && !loading && (
          <div
            className="rounded-xl p-6 text-center space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
              style={{ background: "var(--bg-elevated)" }}
            >
              <Globe className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No clients yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Add a client first, then come back to set up their portal.
              </p>
            </div>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "#22C55E", color: "#fff" }}
            >
              <Plus className="h-4 w-4" />
              Add your first client
            </Link>
          </div>
        )}

        {/* ── Portal list ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        ) : portalsWithClients.length > 0 ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            {portalsWithClients.map(({ client, portal }, idx) => {
              const isEnabled = portal?.isEnabled ?? false;
              const token = portal?.token;
              const isToggling = toggling === client.id;

              return (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-col)" }}
                >
                  {/* ── Left: avatar + name ──────────────────────────────── */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: isEnabled ? "#22C55E20" : "var(--bg-elevated)",
                        color: isEnabled ? "#22C55E" : "var(--text-muted)",
                      }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {client.name}
                        {client.company && (
                          <span className="ml-1.5 font-normal" style={{ color: "var(--text-secondary)" }}>
                            · {client.company}
                          </span>
                        )}
                      </p>
                      {token ? (
                        <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>
                          /portal/{token}
                        </p>
                      ) : (
                        <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                          Toggle on to create portal
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Right: toggle + actions ───────────────────────────── */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Toggle — activates or creates portal in one click */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs"
                        style={{ color: isEnabled ? "#22C55E" : "var(--text-muted)" }}
                      >
                        {isToggling ? "…" : isEnabled ? "Live" : "Off"}
                      </span>
                      <Toggle
                        checked={isEnabled}
                        onChange={() => handleToggle(client, portal)}
                        loading={isToggling}
                      />
                    </div>

                    {/* Divider */}
                    <div className="h-4 w-px" style={{ background: "var(--border-col)" }} />

                    {/* Copy link — only once portal exists */}
                    {token && (
                      <>
                        <button
                          onClick={() => handleCopy(token)}
                          title="Copy portal link"
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                          style={{ color: copiedToken === token ? "#22C55E" : "var(--text-muted)" }}
                        >
                          {copiedToken === token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <a
                          href={`/portal/${token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview portal"
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </>
                    )}

                    <Link
                      href={`/clients/${client.id}?tab=portal`}
                      title="Configure portal settings"
                      className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Use the toggle to go live instantly. Click{" "}
          <Settings className="inline h-3 w-3" style={{ color: "var(--text-muted)" }} />{" "}
          to configure what clients can see, add a welcome message, and more.
        </p>
      </div>
    </AppShell>
  );
}
