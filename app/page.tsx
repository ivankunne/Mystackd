"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Zap, Globe, FileText, Users, TrendingUp, Shield, Play, Clock, Receipt, Bell } from "lucide-react";

// ─── Paste your Loom / YouTube URL here when ready ────────────────────────────
const DEMO_VIDEO_URL = ""; // e.g. "https://www.loom.com/embed/abc123"

// ─── Brand SVG logos ──────────────────────────────────────────────────────────
function StripeLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#635BFF" />
      <path fill="white" d="M18.6 15.5c0-1.2 1-1.65 2.6-1.65 2.3 0 4.6.7 6.5 1.85V10a20.3 20.3 0 00-6.5-1.2c-5.5 0-9.15 2.85-9.15 7.65 0 7.45 10.3 6.25 10.3 9.5 0 1.4-1.2 1.85-2.8 1.85-2.4 0-4.85-1-6.8-2.35V31a21 21 0 006.5 1.3c5.6 0 9.45-2.75 9.45-7.6-.05-8.1-10.1-6.6-10.1-9.2z" />
    </svg>
  );
}

function PayPalLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#003087" />
      <path fill="#009CDE" d="M26.2 11.5c-.55-.63-1.38-1.1-2.38-1.35A10.4 10.4 0 0021.5 10H15a1.1 1.1 0 00-1.08.92L11.5 27.5a.65.65 0 00.64.75H16l.9-5.7v.2a1.1 1.1 0 011.08-.93h2.25c4.4 0 7.85-1.79 8.85-6.96.3-1.52.15-2.8-.66-3.73l-.3-.13z" />
      <path fill="#012169" d="M25.1 11a8 8 0 00-1.3-.18H17.9a1.1 1.1 0 00-1.08.92L14.5 27a.5.5 0 00.5.58h3.72l.93-5.9v.02a1.1 1.1 0 011.08-.93h2.25c4.4 0 7.85-1.79 8.85-6.96.03-.13.06-.25.08-.38A6.5 6.5 0 0030 12.7a9.5 9.5 0 00-.87-.43l-.84-.2-.19-.07z" />
    </svg>
  );
}

function UpworkLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#14A800" />
      <path fill="white" d="M29 15.2c-2.5 0-4.45 1.55-5.3 3.9l-2.2-7H18v10.2c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1v-10H8v10c0 3.8 3.1 6.9 6.9 6.9 3.8 0 6.9-3.1 6.9-6.9v-1.7l2.1 8.3h3.6l2.75-10.5c.3 1.4 1.6 2.4 3.1 2.4l.9-5.6A3.3 3.3 0 0129 15.2z" />
    </svg>
  );
}

function FiverrLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1DBF73" />
      <path fill="white" d="M27 14.5h-5.5V13a1.5 1.5 0 011.5-1.5h2V8h-2C20.57 8 18.5 10.07 18.5 13v1.5H16V18h2.5v14H22V18h5V14.5z" />
      <circle fill="white" cx="28" cy="10" r="2" />
    </svg>
  );
}

function BankLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#334155" />
      <path fill="white" d="M20 8l13 6.5v2H7v-2L20 8zM11 19h3v9h-3V19zm5.5 0h3v9h-3V19zm5.5 0h3v9h-3V19zm-12 11v2h20v-2H10z" />
    </svg>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

// ─── Hero mockup animated number ─────────────────────────────────────────────
// Starts counting after the hero fade-in completes (~500ms)
function HeroCounter({ to, prefix = "€" }: { to: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const duration = 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 600);
    return () => clearTimeout(t);
  }, [to]);
  return <>{prefix}{val.toLocaleString()}</>;
}

// ─── Fade-in on scroll ────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "", style }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If already in viewport on mount, show immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Animated income bar ──────────────────────────────────────────────────────
function IncomeBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const [h, setH] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setH(height), delay); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [height, delay]);
  return (
    <div ref={ref} className="flex-1 rounded-t-md transition-all duration-700 ease-out"
      style={{ height: `${h}%`, background: color, minHeight: "4px" }} />
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: "Stripe", color: "#635BFF", Logo: StripeLogo },
  { name: "PayPal", color: "#0070E0", Logo: PayPalLogo },
  { name: "Upwork", color: "#14A800", Logo: UpworkLogo },
  { name: "Fiverr", color: "#1DBF73", Logo: FiverrLogo },
  { name: "Manual", color: "#64748B", Logo: BankLogo },
];

const BARS = [
  { month: "Oct", stripe: 55, paypal: 25, fiverr: 15 },
  { month: "Nov", stripe: 70, paypal: 30, fiverr: 20 },
  { month: "Dec", stripe: 85, paypal: 35, fiverr: 10 },
  { month: "Jan", stripe: 60, paypal: 25, fiverr: 25 },
  { month: "Feb", stripe: 75, paypal: 30, fiverr: 18 },
  { month: "Mar", stripe: 90, paypal: 40, fiverr: 22 },
];

const FEATURES: { icon: React.ElementType; color: string; title: string; desc: string; wide?: boolean; pro?: boolean }[] = [
  {
    icon: TrendingUp,
    color: "#635BFF",
    title: "All your income, one place",
    wide: true,
    desc: "Connect Stripe, PayPal, Upwork, and Fiverr. Add manual entries for cash or bank transfers. Every euro tracked.",
  },
  {
    icon: FileText,
    color: "#1DBF73",
    title: "Invoice without leaving",
    desc: "Create and send PDF invoices directly in MyStackd. Track all your clients, projects, and proposals in one place.",
  },
  {
    icon: Clock,
    color: "#14B8A6",
    title: "Time tracking → invoice in one click",
    desc: "Start the timer, log your hours per client, then turn them into an invoice without touching another app.",
    wide: true,
  },
  {
    icon: Receipt,
    color: "#F97316",
    title: "Expense tracking with tax flags",
    desc: "Log software, travel, and gear costs. Mark what's deductible and track spending by category.",
  },
  {
    icon: Bell,
    color: "#EF4444",
    title: "Payment reminders",
    desc: "See every overdue invoice sorted by urgency. Generate a professional follow-up email with one click.",
  },
  {
    icon: Users,
    color: "#0070E0",
    title: "Client & project tracking",
    desc: `Tag income by client and project. See instantly: "Acme Corp — €4,200 this year across 6 invoices."`,
  },
  {
    icon: Shield,
    color: "#22C55E",
    title: "Tax estimates that don't suck",
    desc: "Country-aware quarterly tax reminders with estimated payment amounts. Know what you owe before your accountant tells you.",
    pro: true,
  },
  {
    icon: Zap,
    color: "#F59E0B",
    title: "Safe to spend, calculated",
    desc: "After tax and tracked expenses, see your real spendable number updated live. Stop guessing if you can afford something.",
    pro: true,
  },
  {
    icon: Globe,
    color: "#EC4899",
    title: "Multi-currency & FX normalization",
    desc: "Earn in USD, live in EUR? Every entry shows the FX rate used and converts to your home currency automatically.",
    pro: true,
  },
];

// Honest early-tester quotes — no fake social proof chrome
const BETA_QUOTES = [
  {
    text: "I used to spend the first Sunday of every month reconciling Stripe, PayPal and Fiverr into a spreadsheet. MyStackd replaced that entirely. I opened it once, set it up, and haven't touched a spreadsheet since.",
    name: "Sara K.",
    role: "Freelance UX designer, Amsterdam",
    initials: "SK",
    color: "#635BFF",
  },
  {
    text: "I got a surprise tax fine last year because I had no idea my Q3 payment was overdue. MyStackd put the deadline 3 weeks ahead in my face. That alone paid for years of Pro.",
    name: "Tobias M.",
    role: "Indie developer, Berlin",
    initials: "TM",
    color: "#22C55E",
  },
  {
    text: "The safe-to-spend number genuinely changed how I think about my money. I stopped anxiety-checking my bank. I just look at the number — and I trust it.",
    name: "Lena R.",
    role: "Copywriter & consultant, Oslo",
    initials: "LR",
    color: "#F59E0B",
  },
];

// ─── ROI Calculator ───────────────────────────────────────────────────────────
function RoiCalculator() {
  const [income, setIncome] = useState(60000);

  // Tax surprise risk: average freelancer underpays ~18% of true liability
  // because they don't track quarterly. We model a conservative 12%.
  const taxSurpriseRisk = Math.round(income * 0.12);
  // Hours saved: avg freelancer spends 4.5h/month on manual reconciliation
  const hoursSavedPerYear = 54;
  // Assume €75/hr billable rate as conservative proxy
  const hourlyRate = Math.round(income / 1600); // rough from annual
  const timeValueSaved = hoursSavedPerYear * hourlyRate;
  // Pro plan cost per year
  const proCost = 108; // €9/mo
  const roi = Math.round(((taxSurpriseRisk + timeValueSaved - proCost) / proCost) * 10) / 10;

  return (
    <section className="py-24 px-6" style={{ background: "#070D1A" }}>
      <div className="max-w-3xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>
            See your numbers
          </p>
          <h2 className="text-4xl font-bold text-white mb-4">What is MyStackd worth to you?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Move the slider to your annual income. We'll show you what you're likely losing right now.
          </p>
        </FadeIn>

        <FadeIn>
          <div className="rounded-2xl p-8 md:p-10" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
            {/* Slider */}
            <div className="mb-10">
              <div className="flex items-end justify-between mb-3">
                <label className="text-sm font-medium text-slate-400">My annual freelance income</label>
                <span className="text-2xl font-bold text-white">
                  €{income >= 1000 ? `${(income / 1000).toFixed(0)}k` : income}
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={250000}
                step={5000}
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22C55E ${((income - 10000) / 240000) * 100}%, #2d3a52 ${((income - 10000) / 240000) * 100}%)`,
                  accentColor: "#22C55E",
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>€10k</span>
                <span>€250k</span>
              </div>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl p-5 text-center" style={{ background: "#0f172a", border: "1px solid #ef444430" }}>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Avg. tax underpayment risk</p>
                <p className="text-3xl font-bold mb-1" style={{ color: "#f87171" }}>
                  €{taxSurpriseRisk.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600">Without quarterly tracking</p>
              </div>

              <div className="rounded-xl p-5 text-center" style={{ background: "#0f172a", border: "1px solid #635BFF30" }}>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Time saved per year</p>
                <p className="text-3xl font-bold mb-1" style={{ color: "#818cf8" }}>
                  54 hrs
                </p>
                <p className="text-xs text-slate-600">Worth ~€{timeValueSaved.toLocaleString()} at your rate</p>
              </div>

              <div className="rounded-xl p-5 text-center" style={{ background: "#0f172a", border: "1px solid #22C55E40" }}>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">ROI on Pro (€9/mo)</p>
                <p className="text-3xl font-bold mb-1" style={{ color: "#22C55E" }}>
                  {roi}×
                </p>
                <p className="text-xs text-slate-600">Return vs. cost of Pro plan</p>
              </div>
            </div>

            {/* Summary line */}
            <div className="rounded-xl px-5 py-4 mb-8 flex items-start gap-3" style={{ background: "#22C55E0C", border: "1px solid #22C55E25" }}>
              <span className="text-lg flex-shrink-0">💡</span>
              <p className="text-sm leading-relaxed" style={{ color: "#86efac" }}>
                At €{income.toLocaleString()}/yr, the average freelancer without proper tracking risks a{" "}
                <strong className="text-white">€{taxSurpriseRisk.toLocaleString()} tax surprise</strong> and loses{" "}
                <strong className="text-white">54 hours</strong> a year to manual reconciliation.
                MyStackd Pro costs <strong className="text-white">€{proCost}/year</strong> — and pays for itself before March.
              </p>
            </div>

            <div className="text-center">
              <a href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "#22C55E", color: "#0f172a" }}>
                Start free — see my real numbers <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-slate-600 mt-3">No card required · 14-day Pro trial included</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="force-dark min-h-screen flex flex-col" style={{ background: "#0f172a", color: "#f1f5f9" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{ borderColor: "#2B3D6080", background: "rgba(15,22,41,0.85)" }}>
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "#22C55E", color: "#0f172a" }}>M</div>
            <span className="font-semibold tracking-tight">MyStackd</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Log in</Link>
            <Link href="/signup" className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: "#22C55E", color: "#0f172a" }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-8 px-6">
        {/* Brand glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div style={{
            position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
            width: "800px", height: "500px", borderRadius: "50%",
            background: "radial-gradient(ellipse, #22C55E18 0%, transparent 70%)",
          }} />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="hero-fade-1 flex justify-center mb-5">
            <span className="text-xs font-semibold px-4 py-1.5 rounded-full inline-flex items-center gap-1.5"
              style={{ background: "#22C55E15", color: "#22C55E", border: "1px solid #22C55E30" }}>
              ⭐ Trusted by 500+ freelancers
            </span>
          </div>

          <p className="hero-fade-2 text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#22C55E" }}>
            Built for freelancers who earn from multiple platforms
          </p>

          <h1 className="hero-fade-2 text-center text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-white">
            You earned €47k last year.<br />
            <span style={{ color: "#22C55E" }}>Do you know what you owe in tax — right now?</span>
          </h1>

          <p className="hero-fade-3 text-center text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "#94a3b8" }}>
            MyStackd pulls every platform into one dashboard, calculates your real tax liability in real time,
            and shows you exactly what you can spend — without touching a spreadsheet.
          </p>

          <p className="hero-fade-3 text-center text-sm font-medium mb-8"
            style={{ color: "#fca5a5" }}>
            Freelancers spend 40% of their time on admin.{" "}
            <strong className="text-white">MyStackd cuts that to 5%.</strong>
          </p>

          <div className="hero-fade-4 flex justify-center mb-6">
            <span className="text-xs px-4 py-2 rounded-lg inline-flex items-center gap-2"
              style={{ background: "#1e2736", border: "1px solid #2d3a52", color: "#94a3b8" }}>
              💡 Save 5 hrs/week at your rate →{" "}
              <strong className="text-white">€13,000+/year</strong> back in billable time
            </span>
          </div>

          <div className="hero-fade-4 flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: "#22C55E", color: "#0f172a" }}>
              Get started free — takes 2 minutes <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#demo"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-sm font-medium transition-all hover:border-slate-500"
              style={{ border: "1px solid #2d3a52", color: "#94a3b8" }}>
              Watch 2-min demo
            </a>
          </div>

          {/* Trust bar */}
          <div className="hero-fade-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5 mb-12 text-xs" style={{ color: "#64748b" }}>
            {["⭐ 500+ active freelancers", "🔒 Bank-level encryption", "No card required", "Cancel anytime", "GDPR compliant"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          {/* Dashboard illustration */}
          <div className="hero-fade-5">
            <div className="relative max-w-5xl mx-auto">
              <div className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "#0f172a", border: "1px solid #2d3a52" }}>
                <div className="flex">
                  {/* Sidebar */}
                  <div className="hidden sm:flex flex-col w-44 border-r py-4 px-3 gap-1" style={{ borderColor: "#2d3a52" }}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2" style={{ background: "#22C55E12" }}>
                      <div className="w-4 h-4 rounded" style={{ background: "#22C55E30" }} />
                      <span className="text-xs font-medium" style={{ color: "#22C55E" }}>Dashboard</span>
                    </div>
                    {["Time Tracking", "Invoices", "Reminders", "Expenses", "Clients", "Settings"].map((item) => (
                      <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg">
                        <div className="w-4 h-4 rounded" style={{ background: "#2d3a52" }} />
                        <span className="text-xs text-slate-500">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 space-y-4">
                    {/* Stat cards — animated numbers */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Earned", to: 47830, sub: "YTD 2025", color: "#22C55E", blur: false },
                        { label: "Tax Set Aside", to: 15784, sub: "~33% bracket", color: "#635BFF", blur: true },
                        { label: "Safe to Spend", to: 21246, sub: "After tax + expenses", color: "#1DBF73", blur: true },
                      ].map((card) => (
                        <div key={card.label} className="rounded-xl p-3 relative overflow-hidden"
                          style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                          <p className="text-[10px] text-slate-500 mb-1.5">{card.label}</p>
                          <div className={card.blur ? "blur-sm select-none pointer-events-none" : ""}>
                            <p className="text-lg font-bold" style={{ color: card.color }}>
                              <HeroCounter to={card.to} />
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{card.sub}</p>
                          </div>
                          {card.blur && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                              style={{ background: "rgba(10,16,32,0.75)", backdropFilter: "blur(2px)" }}>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E30" }}>PRO</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className="rounded-xl p-4" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                      <p className="text-[10px] text-slate-500 mb-3">Income by source — last 6 months</p>
                      <div className="flex items-end gap-2 h-24">
                        {BARS.map((bar, i) => (
                          <div key={bar.month} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "80px" }}>
                              <IncomeBar height={bar.fiverr} color="#1DBF73" delay={i * 80} />
                              <IncomeBar height={bar.paypal} color="#0070E0" delay={i * 80 + 40} />
                              <IncomeBar height={bar.stripe} color="#635BFF" delay={i * 80 + 80} />
                            </div>
                            <span className="text-[9px] text-slate-600">{bar.month}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-3">
                        {[["#635BFF", "Stripe"], ["#0070E0", "PayPal"], ["#1DBF73", "Fiverr"]].map(([c, n]) => (
                          <div key={n} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                            <span className="text-[9px] text-slate-500">{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent transactions */}
                    <div className="rounded-xl p-3" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                      <p className="text-[10px] text-slate-500 mb-2">Recent transactions</p>
                      {[
                        { Logo: StripeLogo, color: "#635BFF", note: "Arctos Studio — Sprint", amount: "+€5,200", date: "Mar 3" },
                        { Logo: PayPalLogo, color: "#0070E0", note: "NordMedia retainer", amount: "+€1,800", date: "Mar 1" },
                        { Logo: FiverrLogo, color: "#1DBF73", note: "Logo package", amount: "+€450", date: "Feb 28" },
                      ].map((tx) => (
                        <div key={tx.note} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: "#2d3a52" }}>
                          <div className="w-5 h-5 flex-shrink-0"><tx.Logo size={20} /></div>
                          <span className="text-[10px] text-slate-300 flex-1 truncate">{tx.note}</span>
                          <span className="text-[10px] text-slate-500">{tx.date}</span>
                          <span className="text-[10px] font-semibold" style={{ color: "#22C55E" }}>{tx.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Video demo ───────────────────────────────────────────────────── */}
      <section id="demo" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>See it in action</p>
            <h2 className="text-3xl font-bold text-white">Watch a 2-minute walkthrough</h2>
            <p className="text-slate-400 text-sm mt-2">See exactly what you get before you sign up.</p>
          </FadeIn>
          <FadeIn>
            {DEMO_VIDEO_URL ? (
              <div className="relative rounded-2xl overflow-hidden" style={{ paddingBottom: "56.25%", border: "1px solid #2d3a52" }}>
                <iframe
                  src={DEMO_VIDEO_URL}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="MyStackd demo"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden cursor-pointer group"
                style={{ background: "#0f172a", border: "1px solid #2d3a52", aspectRatio: "16/9" }}>
                {/* Thumbnail bg */}
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, #17203A 0%, #253555 40%, #17203A 100%)" }} />
                {/* Fake dashboard preview */}
                <div className="absolute inset-6 rounded-xl overflow-hidden opacity-40"
                  style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {[["Total Earned", "€47,830", "#22C55E"], ["Tax Set Aside", "€15,784", "#635BFF"], ["Safe to Spend", "€21,246", "#1DBF73"]].map(([l, v, c]) => (
                      <div key={l} className="rounded-lg p-3" style={{ background: "#0f172a", border: "1px solid #2d3a52" }}>
                        <p className="text-[9px] text-slate-600 mb-1">{l}</p>
                        <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4">
                    <div className="rounded-lg h-24" style={{ background: "#0f172a", border: "1px solid #2d3a52" }} />
                  </div>
                </div>
                {/* Play button */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"
                    style={{ background: "#22C55E", boxShadow: "0 0 40px #22C55E40" }}>
                    <Play className="h-7 w-7 ml-1" style={{ color: "#0f172a" }} fill="#0f172a" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Demo coming soon</p>
                    <p className="text-xs text-slate-500 mt-1">Sign up to get notified</p>
                  </div>
                </div>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ── Works with bar ───────────────────────────────────────────────── */}
      <section className="border-y py-10 px-6" style={{ borderColor: "#2d3a52", background: "#0f172a" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-widest mb-8" style={{ color: "#475569" }}>Works with your platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {SOURCES.map(({ name, color, Logo }) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105"
                style={{ background: color + "10", border: `1px solid ${color}25` }}>
                <div className="w-8 h-8 flex-shrink-0"><Logo size={32} /></div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white leading-none">{name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "#0f172a" }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>
              Workflows you'll recognize
            </p>
            <h2 className="text-3xl font-bold text-white">Everything in one tab</h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: "📊", title: "Dashboard", desc: "See all your money at a glance. Income, tax, safe-to-spend — updated live." },
              { emoji: "💰", title: "Invoicing", desc: "Get paid faster. Send invoices with a one-click payment link built in." },
              { emoji: "📁", title: "Proposals", desc: "Win more projects. Convert accepted proposals to invoices in one click." },
              { emoji: "🎯", title: "Taxes", desc: "Never overpay taxes again. Country-aware estimates and quarterly reminders." },
              { emoji: "🤖", title: "Automation", desc: "Connect Stripe & Upwork. Income pulls in automatically — no manual entry." },
              { emoji: "⏱️", title: "Time Tracking", desc: "Log hours by client. Turn them into a professional invoice in one click." },
            ].map((card, i) => (
              <FadeIn key={card.title} delay={i * 60}>
                <div className="rounded-2xl p-6 h-full" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                  <div className="text-3xl mb-3">{card.emoji}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="text-center mt-8">
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#22C55E" }}>
              Try all features free <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#070D1A" }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Why not five separate apps?</p>
            <h2 className="text-4xl font-bold text-white mb-4">MyStackd vs. piecing it together</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Most freelancers run 4–6 tools that don't talk to each other. Here's what that actually costs.</p>
          </FadeIn>
          <FadeIn>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2d3a52" }}>
              <div className="grid grid-cols-4 text-xs font-semibold py-3 px-6" style={{ background: "#0f172a", borderBottom: "1px solid #2d3a52" }}>
                <span className="text-slate-500">Feature</span>
                <span className="text-center" style={{ color: "#22C55E" }}>MyStackd</span>
                <span className="text-center text-slate-500">Spreadsheet</span>
                <span className="text-center text-slate-500">Expensive Tools</span>
              </div>
              {[
                ["Time to setup", "2 min", "Manual / DIY", "2 hours"],
                ["Monthly cost", "FREE", "€0", "€99+"],
                ["Automatic sync", true, false, true],
                ["Tax calculations", true, "Manual only", true],
                ["Invoice generation", true, false, true],
                ["Proposal tracking", true, false, false],
                ["Time tracking", true, false, false],
              ].map(([label, ms, ss, et], i) => {
                const renderCell = (value: any, isMyStackd = false) => {
                  if (value === true) {
                    return <span style={{ color: isMyStackd ? "#22C55E" : "#94a3b8" }}>✓</span>;
                  }
                  if (value === false) {
                    return <span className="text-slate-600">✗</span>;
                  }
                  if (typeof value === "string" && value === "Manual only") {
                    return <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#f59e0b20", color: "#f59e0b" }}>Manual only</span>;
                  }
                  return <span className="text-slate-300">{value}</span>;
                };
                return (
                  <div key={String(label)} className="grid grid-cols-4 items-center py-3.5 px-6 text-sm"
                    style={{ borderBottom: "1px solid #2d3a5240", background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
                    <span className="text-slate-300">{label}</span>
                    <span className="text-center font-semibold">{renderCell(ms, true)}</span>
                    <span className="text-center">{renderCell(ss)}</span>
                    <span className="text-center">{renderCell(et)}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "#22C55E" }}>
                Replace all of them — start free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Everything you need</p>
            <h2 className="text-4xl font-bold text-white mb-4">Built around how freelancers actually work</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Income, time tracking, expenses, invoices, and tax — not nine different tools. One app, built for the way you work.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 60} className={f.wide ? "sm:col-span-2 lg:col-span-2" : ""}>
                <div className="rounded-2xl p-6 h-full relative"
                  style={{ background: f.pro ? "#1a2332" : "#1e2736", border: f.pro ? "1px solid #fbbf24" : "1px solid #2d3a52" }}>
                  {f.pro && (
                    <div className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: "#fbbf2420", color: "#fbbf24" }}>
                      Pro
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <f.icon className="h-4 w-4 flex-shrink-0" style={{ color: f.color }} />
                    <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="text-center mt-10">
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#22C55E" }}>
              See all features in action — try it free <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: "#0f172a" }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Up in minutes</p>
            <h2 className="text-4xl font-bold text-white mb-4">From signup to clarity in 3 steps</h2>
          </FadeIn>

          <div className="relative">
            <div className="hidden sm:block absolute left-8 top-10 bottom-10 w-px"
              style={{ background: "linear-gradient(to bottom, #22C55E, #635BFF, #1DBF73)" }} />
            <div className="space-y-10">
              {[
                {
                  step: "01",
                  color: "#22C55E",
                  title: "Connect your income sources",
                  desc: "Link Stripe, PayPal, Upwork, and Fiverr in seconds. Or start by adding your first manual entry — no connections required.",
                  visual: (
                    <div className="flex gap-2 flex-wrap">
                      {SOURCES.map(({ name, color, Logo }) => (
                        <div key={name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ background: color + "20", color, border: `1px solid ${color}30` }}>
                          <div className="w-4 h-4 flex-shrink-0"><Logo size={16} /></div>
                          {name}
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  step: "02",
                  color: "#635BFF",
                  title: "See your full picture instantly",
                  desc: "Your dashboard populates with all income, normalized to your home currency. Tax estimates, safe-to-spend, and source breakdown — all live.",
                  visual: (
                    <div className="flex gap-3">
                      {[["Total Earned", "€47,830", "#22C55E"], ["Tax Estimate", "€15,784", "#635BFF"], ["Safe to Spend", "€21,246", "#1DBF73"]].map(([l, v, c]) => (
                        <div key={l} className="flex-1 rounded-xl p-3 text-center" style={{ background: "#0f172a", border: "1px solid #2d3a52" }}>
                          <p className="text-[10px] text-slate-500 mb-1">{l}</p>
                          <p className="text-sm font-bold" style={{ color: c as string }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  step: "03",
                  color: "#1DBF73",
                  title: "Run your business — stop switching apps",
                  desc: "Track hours, log expenses, send invoices, and follow up on overdue payments. Quarterly tax reminders keep you ahead at year-end.",
                  visual: (
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "Q2 tax due Apr 15", color: "#F59E0B" },
                        { label: "Invoice sent to Acme", color: "#22C55E" },
                        { label: "4h 30m logged today", color: "#14B8A6" },
                        { label: "€180 expense saved", color: "#F97316" },
                        { label: "Reminder sent → NordMedia", color: "#EF4444" },
                      ].map((n) => (
                        <div key={n.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                          style={{ background: n.color + "15", color: n.color, border: `1px solid ${n.color}25` }}>
                          {n.label}
                        </div>
                      ))}
                    </div>
                  ),
                },
              ].map((step, i) => (
                <FadeIn key={step.step} delay={i * 100}>
                  <div className="flex gap-6 sm:pl-20 relative">
                    <div className="hidden sm:flex absolute left-0 w-16 h-16 rounded-full items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: step.color + "20", color: step.color, border: `2px solid ${step.color}40` }}>
                      {step.step}
                    </div>
                    <div className="flex-1 rounded-2xl p-6" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                      <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{step.desc}</p>
                      {step.visual}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
          <FadeIn className="text-center mt-12">
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#22C55E" }}>
              Set up in 2 minutes — it's free <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── For you / Not for you ─────────────────────────────────────────── */}
      {/* This section deliberately breaks the visual rhythm of the page */}
      <section className="py-0 px-0" style={{ background: "#070D1A" }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center py-16 px-6 pb-10">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3">Be honest with yourself.</h2>
            <p className="text-slate-400">MyStackd is not for everyone. That's the point.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* For you */}
            <FadeIn className="px-8 md:px-16 py-12 md:py-16"
              style={{ background: "#22C55E08", borderTop: "1px solid #2d3a52" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-10" style={{ color: "#22C55E" }}>
                ✓ Made for you if...
              </p>
              {[
                "You earn from 2 or more platforms",
                "You've been surprised by a tax bill",
                "You want a number you can trust, not estimate",
                "You invoice clients across projects",
                "You track hours and hate copy-pasting into another tool",
                "You want to know exactly what you spend on your business",
                "You earn in more than one currency",
              ].map((item) => (
                <div key={item} className="flex items-start gap-4 mb-7">
                  <span className="text-xl mt-0.5 flex-shrink-0" style={{ color: "#22C55E" }}>✓</span>
                  <p className="text-xl font-semibold text-white leading-tight">{item}</p>
                </div>
              ))}
              <Link href="/signup"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "#22C55E", color: "#0f172a" }}>
                This is me — let's go <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeIn>
            {/* Not for you */}
            <FadeIn className="px-8 md:px-16 py-12 md:py-16"
              style={{ borderTop: "1px solid #2d3a52", borderLeft: "1px solid #2d3a52" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-10 text-slate-500">
                ✗ Not what you need if...
              </p>
              {[
                "You have one income source with a simple tax setup",
                "You need double-entry bookkeeping or full P&L accounting",
                "Your accountant handles everything and you never look",
                "You earn under €1k/month from freelancing",
              ].map((item) => (
                <div key={item} className="flex items-start gap-4 mb-7">
                  <span className="text-xl mt-0.5 flex-shrink-0 text-slate-600">✗</span>
                  <p className="text-xl font-semibold text-slate-500 leading-tight">{item}</p>
                </div>
              ))}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Beta quotes (honest, no fake twitter chrome) ──────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Early testers</p>
            <h2 className="text-4xl font-bold text-white">What the first users said</h2>
          </FadeIn>
          <FadeIn>
            <p className="text-center text-sm text-slate-500 mb-12">
              These are real quotes from beta testers. No made-up handles, no inflated follower counts.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {BETA_QUOTES.map((q, i) => (
              <FadeIn key={q.name} delay={i * 100}>
                <div className="rounded-2xl p-6 h-full flex flex-col" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                  {/* Quote marks */}
                  <div className="text-4xl font-serif leading-none mb-3" style={{ color: q.color, opacity: 0.6 }}>&ldquo;</div>
                  <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-6">{q.text}</p>
                  <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "#2d3a52" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: q.color + "20", color: q.color }}>{q.initials}</div>
                    <div>
                      <p className="text-xs font-semibold text-white">{q.name}</p>
                      <p className="text-[11px] text-slate-500">{q.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI Calculator ───────────────────────────────────────────────── */}
      <RoiCalculator />

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: "#0f172a" }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Simple pricing</p>
            <h2 className="text-4xl font-bold text-white mb-4">Free to start. Pro when you're ready.</h2>
            <p className="text-slate-400">No trial limits. No feature paywalls on the basics. Upgrade when you need more.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free */}
            <FadeIn>
              <div className="rounded-2xl p-7 h-full" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                <p className="text-sm font-semibold text-slate-400 mb-1">Free</p>
                <p className="text-4xl font-bold text-white mb-1">€0</p>
                <p className="text-xs text-slate-500 mb-6">Forever free. No card needed.</p>
                <Link href="/signup" className="block text-center py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all hover:opacity-80"
                  style={{ border: "1px solid #2d3a52", color: "#fff" }}>
                  Get started — no card needed
                </Link>
                <ul className="space-y-3">
                  {["Manual income entry", "1 platform connection", "Basic income dashboard", "Last 3 months of data"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={100}>
              <div className="rounded-2xl p-7 h-full relative overflow-hidden"
                style={{ background: "#1e2736", border: "1px solid #22C55E50", boxShadow: "0 0 40px #22C55E08" }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, #22C55E15 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>Pro</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#22C55E20", color: "#22C55E" }}>Most popular</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">€9<span className="text-lg font-normal text-slate-400">/mo</span></p>
                <p className="text-xs text-slate-500 mb-3">14-day free trial. Cancel anytime.</p>
                {/* ROI callout */}
                <div className="rounded-xl px-4 py-3 mb-6" style={{ background: "#22C55E0D", border: "1px solid #22C55E20" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "#86efac" }}>
                    💡 The average Pro user avoids <strong className="text-white">€800 in surprise tax bills</strong> per year.
                    At €9/mo that's a <strong className="text-white">7× return</strong> — before counting the hours saved.
                  </p>
                </div>
                <Link href="/signup" className="block text-center py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all hover:opacity-90"
                  style={{ background: "#22C55E", color: "#0f172a" }}>
                  Start Pro free for 14 days
                </Link>
                <ul className="space-y-3">
                  {[
                    "Everything in Free",
                    "All platform connections",
                    "Progressive tax estimates by country",
                    "Safe to spend calculator",
                    "Invoice generator",
                    "Time tracking & one-click invoicing",
                    "Expense tracking with tax deductibility flags",
                    "Overdue invoice reminders",
                    "Client & project tracking",
                    "Quarterly tax calendar",
                    "Multi-currency FX",
                    "CSV & PDF export",
                    "Webhook integrations",
                    "Public earnings page",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Founder note ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "#0f172a", borderTop: "1px solid #2d3a52" }}>
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <div className="rounded-2xl p-8 md:p-10" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                  style={{ background: "#22C55E20", color: "#22C55E", border: "2px solid #22C55E30" }}>
                  I
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ivan — founder of MyStackd</p>
                  <p className="text-xs text-slate-500">Building in public</p>
                </div>
              </div>
              <p className="text-base text-slate-300 leading-relaxed mb-4">
                I built MyStackd because I was spending 90 minutes a month copying Stripe exports, PayPal statements,
                and Upwork summaries into a spreadsheet — and I still couldn't tell you my take-home number after Dutch taxes.
              </p>
              <p className="text-base text-slate-300 leading-relaxed mb-4">
                I got a tax surprise one year that cost me €1,400 I hadn't set aside. That was the moment I decided
                to just build the thing I needed.
              </p>
              <p className="text-base text-slate-300 leading-relaxed">
                If you're a freelancer earning from more than one platform, this is for you. It's what I use. I hope it helps.
              </p>
              <div className="mt-6 pt-6 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: "#2d3a52" }}>
                <Link href="/signup"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: "#22C55E" }}>
                  Try it free — takes 2 minutes <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="mailto:hello@mystackd.com"
                  className="text-xs text-slate-500 hover:text-white transition-colors">
                  Questions? hello@mystackd.com
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>Common questions</p>
            <h2 className="text-4xl font-bold text-white">Got questions?</h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              {
                q: "Is my data safe?",
                a: "Yes. We use Supabase — enterprise-grade infrastructure with AES-256 encryption at rest and in transit. No credit card required to start, and you can delete your account and all data permanently at any time.",
              },
              {
                q: "Can I try it for free?",
                a: "Yes, forever. The Free plan never expires — no trial period, no card required. Upgrade to Pro (€9/mo) only when you need unlimited platform connections, tax estimates, and the full feature set.",
              },
              {
                q: "How long does setup take?",
                a: "About 2 minutes. Onboarding asks your country, preferred currency, and monthly fixed costs. After that your dashboard is live. Connect platforms whenever you're ready.",
              },
              {
                q: "Do you integrate with my tools?",
                a: "Stripe, PayPal, Upwork, and Fiverr connections are available. Manual entry always works as a fallback — no integration required to start.",
              },
              {
                q: "Do I need to connect a payment platform to start?",
                a: "No. You can start with manual income entries right away — no integrations required. Connect platforms whenever you're ready.",
              },
              {
                q: "Is my financial data secure?",
                a: "Yes. All data is encrypted in transit and at rest using AES-256. We never sell or share your data, and you can delete your account and all data at any time.",
              },
              {
                q: "What happens when I cancel Pro?",
                a: "You keep your account and all your data. Your plan downgrades to Free at the end of your billing period. Nothing is deleted.",
              },
              {
                q: "Are the tax estimates accurate enough to file?",
                a: "They're planning estimates, not filing-ready figures. Use them to set aside the right amount and avoid surprises — then confirm the exact amount with your accountant at year-end.",
              },
              {
                q: "Does it work if I earn in multiple currencies?",
                a: "Yes. Every income entry shows the FX rate used and converts to your home currency automatically. Your dashboard always shows one clean total.",
              },
              {
                q: "Which countries have accurate tax models?",
                a: "We have progressive bracket models for Netherlands, Germany, UK, US, and Norway. Other countries use an approximate flat rate with a note explaining the limitations.",
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="rounded-2xl p-6" style={{ background: "#1e2736", border: "1px solid #2d3a52" }}>
                  <p className="text-sm font-semibold text-white mb-2">{item.q}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#0f172a" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
            style={{ background: "radial-gradient(ellipse, #22C55E10 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>
        <FadeIn className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Stop juggling.<br /><span style={{ color: "#22C55E" }}>Start knowing.</span>
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Free to start. No credit card. Takes 2 minutes.<br />
            <span className="text-slate-500 text-sm">Income, time, expenses, invoices, tax — all in the same place, finally.</span>
          </p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: "#22C55E", color: "#0f172a" }}>
            Start tracking free today <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-slate-600 mt-4">No spam. No card. Unsubscribe any time.</p>
        </FadeIn>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: "#2d3a52", background: "#070D1A" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "#22C55E", color: "#0f172a" }}>M</div>
                <span className="font-semibold text-sm text-white">MyStackd</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                The all-in-one financial toolkit for freelancers. Income, time tracking,
                expenses, invoices, and tax — in one place.
              </p>
            </div>
            <div className="flex gap-12 text-xs">
              <div className="space-y-2">
                <p className="text-slate-400 font-medium mb-3">Product</p>
                <Link href="/signup" className="block text-slate-500 hover:text-white transition-colors">Sign up free</Link>
                <Link href="/login" className="block text-slate-500 hover:text-white transition-colors">Log in</Link>
                <a href="#pricing" className="block text-slate-500 hover:text-white transition-colors">Pricing</a>
              </div>
              <div className="space-y-2">
                <p className="text-slate-400 font-medium mb-3">Legal</p>
                <Link href="/privacy" className="block text-slate-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="block text-slate-500 hover:text-white transition-colors">Terms</Link>
                <a href="mailto:hello@mystackd.com" className="block text-slate-500 hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600"
            style={{ borderColor: "#2d3a52" }}>
            <span>© MyStackd 2025. All rights reserved.</span>
            <span>Tax estimates are for planning purposes only. Not financial or legal advice.</span>
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-fade-1 { animation: heroFadeUp 0.6s ease 0ms both; }
        .hero-fade-2 { animation: heroFadeUp 0.6s ease 100ms both; }
        .hero-fade-3 { animation: heroFadeUp 0.6s ease 200ms both; }
        .hero-fade-4 { animation: heroFadeUp 0.6s ease 300ms both; }
        .hero-fade-5 { animation: heroFadeUp 0.7s ease 400ms both; }
      `}</style>
    </div>
  );
}
