"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Unplug, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  connectSource,
  disconnectSource,
  syncSource,
  getOAuthConnectUrl,
} from "@/lib/data/connections";
import type { Connection, IncomeSource } from "@/lib/mock-data";
import dayjs from "dayjs";
import { useAuth } from "@/lib/context/AuthContext";

const SOURCE_CONFIG: Record<
  IncomeSource,
  { label: string; color: string; description: string }
> = {
  stripe: {
    label: "Stripe",
    color: "#635BFF",
    description: "Sync payments from Stripe Connect",
  },
  paypal: {
    label: "PayPal",
    color: "#0070E0",
    description: "Import PayPal business transactions",
  },
  upwork: {
    label: "Upwork",
    color: "#14A800",
    description: "Sync freelance earnings from Upwork",
  },
  fiverr: {
    label: "Fiverr",
    color: "#1DBF73",
    description: "Import Fiverr earnings via CSV",
  },
  manual: {
    label: "Manual Entry",
    color: "#64748B",
    description: "Add income entries manually",
  },
};

function SourceLogo({ source, color }: { source: IncomeSource; color: string }) {
  const initials = SOURCE_CONFIG[source]?.label?.slice(0, 2).toUpperCase() ?? "??";
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ background: `${color}22`, border: `1px solid ${color}44` }}
    >
      <span style={{ color }}>{initials}</span>
    </div>
  );
}

interface SourceCardProps {
  connection: Connection;
  onUpdate?: (updated: Connection) => void;
}

export function SourceCard({ connection, onUpdate }: SourceCardProps) {
  const { user } = useAuth();
  const [conn, setConn] = useState<Connection>(connection);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const config = SOURCE_CONFIG[conn.source];
  const isConnected = conn.status === "connected";
  const isOAuthSource = ["stripe", "paypal", "upwork"].includes(conn.source);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // OAuth sources need to redirect to their OAuth URL
      if (isOAuthSource) {
        const url = await getOAuthConnectUrl(conn.source, user?.id);
        if (url) {
          window.location.href = url;
        }
      } else {
        // Non-OAuth sources (manual, fiverr CSV) just mark as connected
        const updated = await connectSource(conn.source);
        setConn(updated);
        onUpdate?.(updated);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectSource(conn.source);
      const updated: Connection = { ...conn, status: "disconnected", connectedAt: null };
      setConn(updated);
      onUpdate?.(updated);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncSource(conn.source);
      setSyncMessage(`Synced ${result.synced} new entries`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isConnected ? config.color + "30" : "var(--border-col)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <SourceLogo source={conn.source} color={config.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{config.label}</h3>
            {isConnected ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#22C55E15", color: "#22C55E" }}
              >
                <CheckCircle className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#64748B20", color: "#94a3b8" }}
              >
                <XCircle className="h-3 w-3" />
                Disconnected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
          {isConnected && conn.connectedAt && (
            <p className="text-xs text-slate-600 mt-0.5">
              Connected {dayjs(conn.connectedAt).format("MMM D, YYYY")}
            </p>
          )}
        </div>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <p className="text-xs font-medium" style={{ color: "#22C55E" }}>
          {syncMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isConnected ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync now"}
            </Button>
            {conn.source !== "manual" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 text-slate-500 hover:text-red-400"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <Unplug className="h-3.5 w-3.5 mr-1.5" />
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            className="text-xs h-8 font-semibold"
            style={{ background: config.color, color: "#fff" }}
            onClick={handleConnect}
            disabled={isConnecting}
          >
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            {isConnecting ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}
