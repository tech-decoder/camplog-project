import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/camplog.svg" alt="CampLog" width={28} height={28} className="rounded-lg" />
            <span className="font-semibold text-foreground">CampLog</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: February 25, 2026</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using CampLog, you agree to be bound by these Terms of Service. If you do not agree
              to these terms, you may not use the service. CampLog reserves the right to update these terms at any
              time, and continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CampLog is a campaign change tracking platform that uses AI to extract structured data from text
              messages and screenshots. The service is designed for performance marketers to log, track, and
              analyze campaign changes and their impact over time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the security of your account credentials. You must provide
              accurate information when creating an account or joining the waitlist. You may not share your
              account with others or use another person&apos;s account without permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to use CampLog only for lawful purposes related to campaign management and performance
              tracking. You may not use the service to store or transmit malicious content, attempt to gain
              unauthorized access to our systems, or interfere with other users&apos; use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data and Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all campaign data, screenshots, and content you submit to CampLog. By
              using the service, you grant us a limited license to process your data through our AI extraction
              pipeline and store it securely for the purpose of providing the service. You are responsible for
              ensuring you have the right to upload any content you submit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              CampLog uses AI to extract metrics, generate impact assessments, and create reports. While we
              strive for accuracy, AI-generated content may contain errors. You are responsible for reviewing
              and verifying all extracted data and should not rely solely on AI outputs for critical business
              decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We aim to provide reliable service but do not guarantee uninterrupted access. CampLog may be
              temporarily unavailable for maintenance, updates, or due to circumstances beyond our control.
              We will make reasonable efforts to notify users of planned downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              CampLog is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
              indirect, incidental, or consequential damages arising from your use of the service, including
              but not limited to loss of data, revenue, or business opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to CampLog at any time for violation
              of these terms. You may also terminate your account at any time by contacting us. Upon
              termination, your data will be deleted within 30 days unless otherwise required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please reach out to us at legal@camplog.dev.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground/60">
          <p>&copy; 2026 CampLog</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
            <Link href="/" className="hover:text-muted-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
