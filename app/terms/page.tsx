"use client";

import Link from "next/link";

const LAST_UPDATED = "8 April 2026";
const CONTACT_EMAIL = "hello@mystackd.com";
const APP_URL = "https://mystackd.com";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
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

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div
          className="rounded-xl p-4 mb-10 text-sm text-slate-400"
          style={{ background: "#22C55E10", border: "1px solid #22C55E30" }}
        >
          Please read these Terms of Service carefully before using MyStackd. By creating an
          account or using the service, you agree to be bound by these terms.
        </div>

        {/* 1 */}
        <Section id="acceptance" title="1. Acceptance of Terms">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of
            MyStackd (&quot;Service&quot;), operated by MyStackd (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;). By registering for an account or using
            the Service, you agree to these Terms and our{" "}
            <Link href="/privacy" className="text-green-400 hover:underline">Privacy Policy</Link>.
          </p>
          <p>
            If you do not agree with any part of these Terms, you must not use the Service.
          </p>
          <p>
            You must be at least 16 years old to use MyStackd. By using the Service you
            confirm that you meet this requirement.
          </p>
        </Section>

        {/* 2 */}
        <Section id="description" title="2. Description of Service">
          <p>
            MyStackd is a freelance income tracking and financial management application
            that allows you to:
          </p>
          <ul className="space-y-1">
            <Li>Record and analyse income from multiple sources</Li>
            <Li>Track expenses and estimate tax obligations</Li>
            <Li>Create and manage invoices, proposals, and contracts</Li>
            <Li>Manage clients, projects, and time entries</Li>
            <Li>Optionally publish a public earnings page</Li>
            <Li>Connect income sources via third-party integrations</Li>
          </ul>
          <p>
            The Service is provided as a software-as-a-service tool for personal and
            small-business financial record-keeping. It does <strong className="text-white">not</strong>{" "}
            constitute financial, tax, or legal advice. You remain solely responsible for
            your own tax filing and compliance with applicable law.
          </p>
        </Section>

        {/* 3 */}
        <Section id="accounts" title="3. Your Account">
          <p>
            You are responsible for maintaining the confidentiality of your account
            credentials. You must immediately notify us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-400 hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            if you suspect unauthorised access to your account.
          </p>
          <p>
            You may not share your account with others or create accounts on behalf of
            third parties without their consent. Each account is for a single individual
            or sole trader.
          </p>
          <p>
            You are responsible for all activity that occurs under your account, whether
            or not authorised by you.
          </p>
        </Section>

        {/* 4 */}
        <Section id="acceptable-use" title="4. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="space-y-1">
            <Li>Violate any applicable law or regulation</Li>
            <Li>Process or store financial data belonging to third parties without their explicit consent</Li>
            <Li>Attempt to gain unauthorised access to other accounts or our infrastructure</Li>
            <Li>Reverse-engineer, decompile, or disassemble any part of the Service</Li>
            <Li>Use automated tools (scrapers, bots) to extract data at scale</Li>
            <Li>Transmit malware, viruses, or any other harmful code</Li>
            <Li>Use the public earnings page to publish misleading or fraudulent financial information</Li>
            <Li>Abuse the webhook or API features to attack or overload third-party systems</Li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these rules
            without prior notice.
          </p>
        </Section>

        {/* 5 */}
        <Section id="billing" title="5. Paid Plans and Billing">
          <p>
            MyStackd offers a free tier and optional paid (&quot;Pro&quot;) plans.
            Details of current plans and pricing are available on our website.
          </p>
          <ul className="space-y-1">
            <Li>
              <strong className="text-slate-300">Billing:</strong> Subscriptions are billed
              monthly or annually in advance via Stripe. All prices are shown exclusive of VAT
              unless otherwise stated.
            </Li>
            <Li>
              <strong className="text-slate-300">Cancellation:</strong> You may cancel your
              subscription at any time from Settings → Billing. Access to Pro features continues
              until the end of the current billing period; no pro-rata refund is given for
              unused time.
            </Li>
            <Li>
              <strong className="text-slate-300">Refunds:</strong> We offer a full refund if
              requested within 14 days of first subscribing to a paid plan. Contact{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-400 hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              to request one.
            </Li>
            <Li>
              <strong className="text-slate-300">Price changes:</strong> We will give at
              least 30 days&apos; notice before changing subscription prices. Continued use
              after a price change constitutes acceptance.
            </Li>
            <Li>
              <strong className="text-slate-300">VAT / taxes:</strong> You are responsible
              for any taxes applicable to your use of the Service in your jurisdiction.
            </Li>
          </ul>
        </Section>

        {/* 6 */}
        <Section id="data-ownership" title="6. Your Data">
          <p>
            You retain full ownership of all data you enter into MyStackd — income records,
            invoices, client information, and everything else. We process your data solely
            to provide the Service as described in our{" "}
            <Link href="/privacy" className="text-green-400 hover:underline">Privacy Policy</Link>.
          </p>
          <p>
            You can export a full copy of your data at any time from Settings → Danger Zone.
            You can permanently delete your account and all associated data from the same
            location.
          </p>
          <p>
            By enabling a public earnings page, you grant us a limited licence to display
            the selected aggregated financial information publicly at your chosen URL. You
            can revoke this at any time by disabling the public page.
          </p>
        </Section>

        {/* 7 */}
        <Section id="ip" title="7. Intellectual Property">
          <p>
            The MyStackd name, logo, design, and software (excluding your data) are owned
            by or licensed to us and are protected by copyright, trademark, and other laws.
          </p>
          <p>
            You may not copy, modify, distribute, or create derivative works of the Service
            without our prior written permission, except as permitted by these Terms or
            applicable law.
          </p>
        </Section>

        {/* 8 */}
        <Section id="availability" title="8. Availability and Service Changes">
          <p>
            We aim to provide a reliable service but do not guarantee 100% uptime. We may:
          </p>
          <ul className="space-y-1">
            <Li>Perform scheduled maintenance (we will provide advance notice where possible)</Li>
            <Li>Modify, suspend, or discontinue features with reasonable notice</Li>
            <Li>Discontinue the Service entirely — in that event, we will give at least 90 days&apos; notice and provide data export facilities</Li>
          </ul>
        </Section>

        {/* 9 */}
        <Section id="disclaimer" title="9. Disclaimer of Warranties">
          <p>
            The Service is provided <strong className="text-white">&quot;as is&quot;</strong>{" "}
            and <strong className="text-white">&quot;as available&quot;</strong> without
            warranty of any kind. To the maximum extent permitted by law, we disclaim all
            warranties, express or implied, including warranties of merchantability, fitness
            for a particular purpose, and non-infringement.
          </p>
          <p>
            In particular, MyStackd does not warrant that:
          </p>
          <ul className="space-y-1">
            <Li>Financial calculations, tax estimates, or summaries are accurate or complete</Li>
            <Li>The Service will meet your specific requirements or be error-free</Li>
            <Li>Data will never be lost due to technical failures</Li>
          </ul>
          <p>
            You are responsible for maintaining your own backups of critical financial data
            and for verifying figures before submitting tax returns.
          </p>
        </Section>

        {/* 10 */}
        <Section id="liability" title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, MyStackd shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages,
            including loss of profits, data, goodwill, or other intangible losses, arising
            from your use of or inability to use the Service.
          </p>
          <p>
            Our total liability to you for any claim arising out of these Terms or the
            Service shall not exceed the greater of (a) the total amount you paid us in the
            12 months preceding the claim or (b) EUR 100.
          </p>
          <p>
            Nothing in these Terms excludes liability for death or personal injury caused by
            our negligence, fraud, or any other liability that cannot be excluded by law.
          </p>
        </Section>

        {/* 11 */}
        <Section id="indemnification" title="11. Indemnification">
          <p>
            You agree to indemnify and hold harmless MyStackd and its operators from any
            claims, losses, damages, or expenses (including legal fees) arising from your
            use of the Service in violation of these Terms or applicable law.
          </p>
        </Section>

        {/* 12 */}
        <Section id="termination" title="12. Termination">
          <p>
            Either party may terminate the agreement governed by these Terms at any time.
            You can close your account in Settings → Danger Zone. We may suspend or
            terminate your account if you breach these Terms or if we reasonably believe
            continued access poses a security or legal risk.
          </p>
          <p>
            Upon termination: your access to the Service will end, your data will be
            deleted in accordance with our{" "}
            <Link href="/privacy" className="text-green-400 hover:underline">Privacy Policy</Link>,
            and any outstanding fees remain due.
          </p>
        </Section>

        {/* 13 */}
        <Section id="changes" title="13. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of material
            changes by email at least 14 days before they take effect. For minor changes
            (corrections, clarifications), we will update the &quot;Last updated&quot; date.
            Continued use of the Service after changes take effect constitutes acceptance.
          </p>
        </Section>

        {/* 14 */}
        <Section id="governing-law" title="14. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the Netherlands (or, where applicable,
            Norway), without regard to conflict of law principles.
          </p>
          <p>
            If you have a dispute with us, please first contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-400 hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and we will try to resolve it informally. If we cannot reach a resolution
            within 60 days, disputes shall be submitted to the competent courts of
            Amsterdam, the Netherlands, unless you are a consumer entitled to bring
            proceedings in your country of residence.
          </p>
          <p>
            EU consumers may also use the European Commission&apos;s{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              Online Dispute Resolution platform
            </a>.
          </p>
        </Section>

        {/* 15 */}
        <Section id="contact" title="15. Contact">
          <p>
            For questions about these Terms, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-400 hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            or visit{" "}
            <a href={APP_URL} className="text-green-400 hover:underline">{APP_URL}</a>.
          </p>
        </Section>

        <div className="border-t pt-8 mt-8 text-xs text-slate-600" style={{ borderColor: "var(--border-col)" }}>
          <p>
            © {new Date().getFullYear()} MyStackd ·{" "}
            <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
