"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, ChevronDown, LogOut, User as UserIcon,
  LayoutDashboard, Receipt, Users, Timer, Settings, Search,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { AlertProvider } from "@/lib/context/AlertContext";
import { Sidebar } from "./Sidebar";
import { NotificationCenter } from "./NotificationCenter";
import { CommandPalette } from "./CommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices",  label: "Invoices",  icon: Receipt },
  { href: "/clients",   label: "Clients",   icon: Users },
  { href: "/time",      label: "Time",      icon: Timer },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <AlertProvider>
    <div
      className="app-shell flex h-screen overflow-hidden"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-col)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border-col)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "#16a34a", color: "#ffffff" }}
            >
              M
            </div>
            <span
              className="font-semibold tracking-tight text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              MyStackd
            </span>
          </Link>
          <button
            className="lg:hidden p-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <Sidebar onLinkClick={() => setSidebarOpen(false)} />

        {/* User section */}
        <div
          className="px-3 py-3 border-t"
          style={{ borderColor: "var(--border-col)" }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors outline-none"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ background: "#dcfce7", color: "#16a34a" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {user?.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {user?.email}
                </p>
              </div>
              <ChevronDown
                className="h-3 w-3 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-col)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-sm"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => router.push("/settings")}
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: "var(--border-col)" }} />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-sm"
                style={{ color: "#dc2626" }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-4 lg:px-6 h-14 flex-shrink-0 border-b"
          style={{
            background: "var(--bg-sidebar)",
            borderColor: "var(--border-col)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && (
              <h1
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ⌘K search trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-colors"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-col)",
              }}
            >
              <Search className="h-3 w-3" />
              <span>Search</span>
              <kbd
                className="ml-1 px-1 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
              >
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setCmdOpen(true)}
              className="sm:hidden p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <Search className="h-4 w-4" />
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for the fixed bottom nav */}
        <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
          {authLoading ? (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#22C55E", borderTopColor: "transparent" }}
              />
            </div>
          ) : children}
        </main>
      </div>
    </div>

    <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

    {/* Mobile bottom navigation */}
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1 border-t"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border-col)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 text-center"
            style={{ color: active ? "#22C55E" : "var(--text-muted)" }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
    </AlertProvider>
  );
}
