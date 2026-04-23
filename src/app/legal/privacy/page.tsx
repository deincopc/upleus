import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Upleus collects, uses, and protects your data.",
};

const LAST_UPDATED = "17 April 2026";
const CONTACT_EMAIL = "privacy@upleus.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-white/[0.06] px-6 h-14 flex items-center">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Logo href="/" height={22} dark />
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Back
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-gray-500 mb-4">Last updated: {LAST_UPDATED}</p>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-12">
          This policy explains what data Upleus collects, why, and how it is used and protected.
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-400 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Who we are</h2>
            <p>
              Upleus ("we", "us", "our") is an uptime and infrastructure monitoring service.
              For questions about this policy, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Data we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-gray-300">Account information</strong> — your name and email
                address, provided when you sign up via our authentication provider (Clerk).
              </li>
              <li>
                <strong className="text-gray-300">Monitor configuration</strong> — URLs, hostnames,
                ports, check intervals, and notification recipients you enter.
              </li>
              <li>
                <strong className="text-gray-300">Check results</strong> — status codes, response
                times, SSL certificate details, and error messages captured during automated checks.
              </li>
              <li>
                <strong className="text-gray-300">Usage data</strong> — page views, feature
                interactions, and performance metrics collected via Vercel Analytics.
              </li>
            </ul>
            <p className="mt-3">
              We do not collect payment card data (handled by our payment processor), nor do we
              sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To run your monitors and deliver alert notifications.</li>
              <li>To display historical check results and incident timelines in your dashboard.</li>
              <li>To generate public status pages when you create a project.</li>
              <li>To send transactional emails (alerts, account events) via Resend.</li>
              <li>To improve the service using aggregated, anonymised usage analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Data retention</h2>
            <p>
              Monitor check results are retained for 90 days. Alert history is retained for
              12 months. Account data is retained for as long as your account is active.
              Upon account deletion, your data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Third-party services</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-gray-300">Clerk</strong> — authentication and user management.</li>
              <li><strong className="text-gray-300">Supabase / PostgreSQL</strong> — encrypted data storage.</li>
              <li><strong className="text-gray-300">Resend</strong> — transactional email delivery.</li>
              <li><strong className="text-gray-300">Vercel</strong> — hosting and anonymised usage analytics.</li>
            </ul>
            <p className="mt-3">
              Each provider is bound by their own privacy policy and applicable data protection law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Cookies</h2>
            <p>
              We use only strictly necessary cookies set by our authentication provider (Clerk) to
              maintain your session. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Your rights</h2>
            <p>
              Depending on your jurisdiction you have the right to access, correct, export, or delete
              your personal data. To exercise any of these rights, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">{CONTACT_EMAIL}</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Security</h2>
            <p>
              All data is transmitted over HTTPS. Database connections are encrypted. We apply the
              principle of least privilege to internal system access. No security measure is
              perfect; in the event of a breach we will notify affected users without undue delay.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Changes to this policy</h2>
            <p>
              We may update this policy. Material changes will be communicated by email or via a
              notice in the dashboard at least 14 days before they take effect. Continued use of the
              service constitutes acceptance of the updated policy.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-8 px-6 text-center">
        <p className="text-xs text-gray-600">
          Questions?{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gray-500 hover:text-gray-300 transition-colors">
            {CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}
