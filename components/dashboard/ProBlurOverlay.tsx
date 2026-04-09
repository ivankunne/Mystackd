"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface ProBlurOverlayProps {
  children: React.ReactNode;
  label?: string;
}

export function ProBlurOverlay({ children, label = "Pro feature" }: ProBlurOverlayProps) {
  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="blur-sm select-none pointer-events-none opacity-60">
        {children}
      </div>

      {/* Frosted glass overlay — adapts to theme */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-xl pro-overlay"
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E40" }}
        >
          <Lock className="h-3 w-3" />
          Pro
        </div>
        <p className="text-xs mb-3 text-center px-4 pro-overlay-text">{label}</p>
        <Link
          href="/upgrade"
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
          style={{ background: "#22C55E", color: "#0f172a" }}
        >
          Unlock with Pro — €9/mo
        </Link>
      </div>
    </div>
  );
}
