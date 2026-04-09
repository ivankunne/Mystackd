"use client";

import Link from "next/link";

const LAST_UPDATED = "8 April 2026";
const CONTROLLER_NAME = "MyStackd";
const CONTROLLER_EMAIL = "privacy@mystackd.com";
const APP_URL = "https://mystackd.com";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>
      <div className="space-y-2 text-sm text-slate-400 leading-relaxed">{children}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-slate-600 mt-0.5 flex-shrink-0">—</span>
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold"
            style={{ color: "#22C55E" }}
          >
            ← MyStackd
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div
          className="rounded-xl p-4 mb-10 text-sm text-slate-400"
          style={{ background: "#22C55E10", border: "1px solid #22C55E30" }}
        >
          This policy explains what personal data MyStackd collects, why, how long
          it is kept, who it is shared with, and what rights you have under the
          General Data Protection Regulation (GDPR) and applicable national law.
        </div>

        {/* 1 */}
        <Section id="controller" title="1. Data Controller">
          <p>
            The data controller responsible for processing your personal data is:
          </p>
          <div
            className="rounded-lg p-4 mt-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <p className="text-white font-medium">{CONTROLLER_NAME}</p>
            <p className="mt-1">
              Email:{" "}
              <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-green-400 hover:underline">
                {CONTROLLER_EMAIL}
              </a>
            </p>
            <p>Website: <a href={APP_URL} className="text-green-400 hover:underline">{APP_URL}</a></p>
          </div>
          <p className="mt-3">
            For any privacy-related questions or requests, contact us at the email address
            above. We aim to respond within 30 days.
          </p>
        </Section>

        {/* 2 */}
        <Section id="data-collected" title="2. Personal Data We Collect">
          <p>We collect the following categories of personal data:</p>

          <SubSection title="Account and profile data">
            <ul className="space-y-1">
              <Li>Full name and email address (provided at registration)</Li>
              <Li>Country of residence and preferred currency</Li>
              <Li>Profile photo (if provided via Google OAuth)</Li>
              <Li>Public profile slug (if you enable a public earnings page)</Li>
              <Li>Phone number, website URL, and bio (optional, entered in Settings)</Li>
            </ul>
          </SubSection>

          <SubSection title="Financial data">
            <ul className="space-y-1">
              <Li>Income entries: amount, currency, date, source, client name, notes</Li>
              <Li>Expense entries: amount, category, date, description, tax-deductible flag</Li>
              <Li>Invoice records: client details, line items, amounts, due dates, status</Li>
              <Li>Tax bracket and income goal (self-declared, used for calculations)</Li>
              <Li>Monthly expense estimates (rent, subscriptions, other — entered in Settings)</Li>
            </ul>
          </SubSection>

          <SubSection title="Client and project data">
            <ul className="space-y-1">
              <Li>Client names, email addresses, company names, and addresses</Li>
              <Li>Project names, descriptions, and statuses</Li>
              <Li>Proposals and contracts you create within the app</Li>
              <Li>Time entries linked to projects and clients</Li>
            </ul>
          </SubSection>

          <SubSection title="Technical and usage data">
            <ul className="space-y-1">
              <Li>Authentication tokens (managed by Supabase Auth, stored in cookies)</Li>
              <Li>Device type and browser (via standard HTTP headers)</Li>
              <Li>App preferences: theme, date format, language, notification settings</Li>
              <Li>Referral code (assigned at registration, used to track referrals)</Li>
            </ul>
          </SubSection>

          <SubSection title="Payment data (if billing is enabled)">
            <ul className="space-y-1">
              <Li>Subscription status and plan (managed by Stripe)</Li>
              <Li>Payment method details are stored and processed by Stripe — MyStackd never stores raw card numbers</Li>
            </ul>
          </SubSection>
        </Section>

        {/* 3 */}
        <Section id="legal-basis" title="3. Legal Basis for Processing">
          <p>We rely on the following legal bases under GDPR Article 6:</p>
          <div className="space-y-3 mt-2">
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-slate-300 font-medium mb-1">Contract (Art. 6(1)(b))</p>
              <p>Processing your account, financial, and client data is necessary to provide the MyStackd service you signed up for.</p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-slate-300 font-medium mb-1">Legitimate interests (Art. 6(1)(f))</p>
              <p>We process technical logs and usage data to operate, secure, and improve the service. We balance this against your interests and rights.</p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-slate-300 font-medium mb-1">Consent (Art. 6(1)(a))</p>
              <p>Where we send optional email notifications (weekly digests, monthly reports, product updates), we rely on your in-app consent toggle. You can withdraw this at any time in Settings → Notifications.</p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-slate-300 font-medium mb-1">Legal obligation (Art. 6(1)(c))</p>
              <p>We may retain certain records as required by applicable tax or accounting law.</p>
            </div>
          </div>
        </Section>

        {/* 4 */}
        <Section id="how-we-use" title="4. How We Use Your Data">
          <ul className="space-y-1">
            <Li>Providing, operating, and improving the MyStackd application</Li>
            <Li>Calculating income totals, tax estimates, and financial summaries</Li>
            <Li>Generating invoices, proposals, and contracts on your behalf</Li>
            <Li>Sending transactional emails (invoice overdue alerts, payment notifications)</Li>
            <Li>Sending optional digest emails if you have enabled them</Li>
            <Li>Displaying your public earnings page if you have enabled it</Li>
            <Li>Processing subscription payments via Stripe</Li>
            <Li>Detecting and preventing fraud, abuse, and security incidents</Li>
            <Li>Complying with legal obligations</Li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-white">not</strong> sell your personal data to third
            parties, use it for advertising, or share it for purposes unrelated to operating
            the service.
          </p>
        </Section>

        {/* 5 */}
        <Section id="third-parties" title="5. Third-Party Processors">
          <p>
            We share data with the following sub-processors who act strictly on our
            instructions and are bound by data processing agreements:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                name: "Supabase Inc.",
                role: "Database, authentication, and file storage",
                location: "USA (EU data residency available)",
                link: "https://supabase.com/privacy",
              },
              {
                name: "Resend Inc.",
                role: "Transactional and digest email delivery",
                location: "USA",
                link: "https://resend.com/privacy",
              },
              {
                name: "Stripe Inc.",
                role: "Subscription billing and payment processing",
                location: "USA",
                link: "https://stripe.com/privacy",
              },
              {
                name: "Vercel Inc.",
                role: "Application hosting and edge delivery",
                location: "USA / EU edge nodes",
                link: "https://vercel.com/legal/privacy-policy",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="rounded-lg p-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
              >
                <p className="text-slate-300 font-medium">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.role} · {p.location}</p>
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:underline mt-1 inline-block"
                >
                  Privacy policy →
                </a>
              </div>
            ))}
          </div>
          <p className="mt-4">
            International transfers to the USA are covered by Standard Contractual
            Clauses (SCCs) or the EU-U.S. Data Privacy Framework where applicable.
          </p>
        </Section>

        {/* 6 */}
        <Section id="retention" title="6. Data Retention">
          <ul className="space-y-1">
            <Li>
              <strong className="text-slate-300">Active account data</strong> — retained
              as long as your account exists.
            </Li>
            <Li>
              <strong className="text-slate-300">After account deletion</strong> — all
              profile, financial, and client data is permanently deleted within 30 days.
              Backups are purged within 90 days.
            </Li>
            <Li>
              <strong className="text-slate-300">Financial records</strong> — if required
              by law (e.g. VAT/accounting regulations), we may retain minimal records for
              the legally required period (typically 5–7 years) even after account deletion.
              We will inform you of any such obligation.
            </Li>
            <Li>
              <strong className="text-slate-300">Email logs</strong> — delivery logs held
              by Resend for up to 30 days.
            </Li>
          </ul>
        </Section>

        {/* 7 */}
        <Section id="your-rights" title="7. Your Rights Under GDPR">
          <p>
            You have the following rights regarding your personal data. To exercise any of
            them, contact us at{" "}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-green-400 hover:underline">
              {CONTROLLER_EMAIL}
            </a>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { right: "Right of access (Art. 15)", desc: "Request a copy of all data we hold about you." },
              { right: "Right to rectification (Art. 16)", desc: "Correct inaccurate or incomplete data in Settings." },
              { right: "Right to erasure (Art. 17)", desc: "Delete your account and all data in Settings → Danger Zone." },
              { right: "Right to portability (Art. 20)", desc: "Download all your data as JSON in Settings → Danger Zone." },
              { right: "Right to restrict processing (Art. 18)", desc: "Request we pause processing your data in certain circumstances." },
              { right: "Right to object (Art. 21)", desc: "Object to processing based on legitimate interests, including marketing." },
              { right: "Withdraw consent", desc: "Turn off optional email notifications at any time in Settings → Notifications." },
              { right: "Right to complain", desc: "Lodge a complaint with your national data protection authority." },
            ].map(({ right, desc }) => (
              <div
                key={right}
                className="rounded-lg p-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
              >
                <p className="text-slate-300 font-medium text-xs mb-1">{right}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4">
            We will respond to rights requests within <strong className="text-white">30 days</strong>.
            In complex cases we may extend this by a further two months, in which case we will
            notify you.
          </p>
        </Section>

        {/* 8 */}
        <Section id="public-page" title="8. Public Earnings Page">
          <p>
            If you enable a public earnings page in Settings → Sharing, the following
            information will be publicly accessible at{" "}
            <span className="text-slate-300">mystackd.com/your-slug</span>:
          </p>
          <ul className="space-y-1 mt-2">
            <Li>Your display name</Li>
            <Li>Aggregated income totals and monthly chart for the current year</Li>
            <Li>Number of income sources (not client names or notes)</Li>
          </ul>
          <p className="mt-3">
            Your email address, tax bracket, expenses, client details, and payment
            information are <strong className="text-white">never</strong> included on the
            public page. You can disable your public page at any time; data is removed
            from public access immediately.
          </p>
        </Section>

        {/* 9 */}
        <Section id="cookies" title="9. Cookies and Local Storage">
          <p>MyStackd uses the following storage mechanisms:</p>
          <ul className="space-y-1">
            <Li>
              <strong className="text-slate-300">Session cookies</strong> — set by Supabase Auth
              to maintain your login session. These are strictly necessary and do not require consent.
            </Li>
            <Li>
              <strong className="text-slate-300">localStorage</strong> — used to store UI
              preferences (dismissed banners, theme settings) locally in your browser. No personal
              data is sent to our servers via localStorage.
            </Li>
          </ul>
          <p className="mt-3">
            We do not use tracking cookies, analytics cookies, or advertising cookies.
          </p>
        </Section>

        {/* 10 */}
        <Section id="security" title="10. Security">
          <ul className="space-y-1">
            <Li>All data is transmitted over TLS (HTTPS)</Li>
            <Li>Passwords are hashed by Supabase Auth (bcrypt) — we never store plain-text passwords</Li>
            <Li>Database access is protected by Row-Level Security (RLS) — users can only access their own data</Li>
            <Li>API routes require authenticated sessions; cron endpoints require a shared secret</Li>
            <Li>Service-role database credentials are never exposed to the browser</Li>
          </ul>
          <p className="mt-3">
            If you discover a security vulnerability, please report it responsibly to{" "}
            <a href="mailto:security@mystackd.com" className="text-green-400 hover:underline">
              security@mystackd.com
            </a>.
          </p>
        </Section>

        {/* 11 */}
        <Section id="children" title="11. Children's Privacy">
          <p>
            MyStackd is not directed at children under 16. We do not knowingly collect
            personal data from anyone under 16. If you believe a minor has created an
            account, please contact us and we will delete it promptly.
          </p>
        </Section>

        {/* 12 */}
        <Section id="changes" title="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of
            material changes by email (if you have notifications enabled) and by updating
            the &quot;Last updated&quot; date at the top of this page. Continued use of
            the service after changes take effect constitutes acceptance of the updated
            policy.
          </p>
        </Section>

        {/* 13 */}
        <Section id="contact" title="13. Contact and Supervisory Authority">
          <p>
            For any privacy-related questions, requests, or complaints, contact:{" "}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-green-400 hover:underline">
              {CONTROLLER_EMAIL}
            </a>
          </p>
          <p className="mt-3">
            You also have the right to lodge a complaint with your national data
            protection authority. For example:
          </p>
          <ul className="space-y-1 mt-2">
            <Li>
              <strong className="text-slate-300">Netherlands:</strong>{" "}
              <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                Autoriteit Persoonsgegevens
              </a>
            </Li>
            <Li>
              <strong className="text-slate-300">Norway:</strong>{" "}
              <a href="https://datatilsynet.no" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                Datatilsynet
              </a>
            </Li>
            <Li>
              <strong className="text-slate-300">Other EU/EEA:</strong>{" "}
              <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                Find your authority
              </a>
            </Li>
          </ul>
        </Section>

        <div className="border-t pt-8 mt-8 text-xs text-slate-600" style={{ borderColor: "var(--border-col)" }}>
          <p>© {new Date().getFullYear()} MyStackd · <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link></p>
        </div>
      </div>
    </div>
  );
}
