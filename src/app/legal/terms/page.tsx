import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Upleus.",
};

const LAST_UPDATED = "17 April 2026";
const CONTACT_EMAIL = "legal@upleus.com";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-12">
          Please read these terms carefully before using Upleus. By creating an account or
          using the service you agree to be bound by them.
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-400 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. The service</h2>
            <p>
              Upleus provides uptime, SSL certificate, domain expiry, TCP, and heartbeat
              monitoring ("the Service"). We reserve the right to modify, suspend, or discontinue
              any part of the Service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Eligibility</h2>
            <p>
              You must be at least 16 years old and capable of entering into a binding agreement to
              use the Service. By using the Service you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Your account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and
              for all activity under your account. Notify us immediately of any unauthorised access
              at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Monitor targets you do not own or have explicit permission to monitor.</li>
              <li>Use the Service to conduct denial-of-service or load-testing attacks.</li>
              <li>Attempt to circumvent plan limits or abuse free-tier resources.</li>
              <li>Reverse-engineer, scrape, or resell any part of the Service.</li>
              <li>Use the Service for any unlawful purpose.</li>
            </ul>
            <p className="mt-3">
              Violation of these rules may result in immediate account suspension without refund.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Free plan limits</h2>
            <p>
              The free plan is limited to 5 monitors per type. We reserve the right to adjust
              free-plan limits with 14 days' notice. Paid plans are governed by the pricing page
              in effect at the time of subscription.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Uptime SLA</h2>
            <p>
              We strive for high availability but do not guarantee uninterrupted service. The
              Service is provided "as is". Alert delivery depends on third-party email providers
              and is not guaranteed. We are not liable for missed alerts or monitoring gaps.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Data and privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/legal/privacy" className="text-emerald-400 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Intellectual property</h2>
            <p>
              All content, trademarks, and software comprising the Service remain the property of
              Upleus. You retain full ownership of the URLs and configuration data you enter.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Upleus shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of, or
              inability to use, the Service. Our total liability shall not exceed the amount paid
              by you in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Termination</h2>
            <p>
              You may delete your account at any time from the dashboard. We may terminate or
              suspend your account for breach of these terms. Upon termination, your data will be
              deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">11. Changes to these terms</h2>
            <p>
              We may update these terms. We will notify you by email at least 14 days before
              material changes take effect. Continued use of the Service constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">12. Governing law</h2>
            <p>
              These terms are governed by the laws of the jurisdiction in which Upleus
              operates, without regard to conflict-of-law principles. Any disputes shall be
              resolved in the courts of that jurisdiction.
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
