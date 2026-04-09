import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AppearanceProvider } from "@/lib/context/AppearanceContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MyStackd — Income dashboard for freelancers",
  description:
    "Connect Stripe, PayPal, Upwork, and Fiverr into one clean dashboard. Know what you earned, what you owe in tax, and what you can spend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, geistMono.variable, "light")}
    >
      <head>
        <meta name="theme-color" content="#22C55E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyStackd" />
      </head>
      <body className="font-sans antialiased">
        {/* FOUC prevention — must run before React hydration */}
        <Script id="theme-init" src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <AuthProvider>
            <AppearanceProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AppearanceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
