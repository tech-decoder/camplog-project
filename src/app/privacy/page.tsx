import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: February 25, 2026</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you use CampLog, we collect information you provide directly, including your name, email address,
              professional role, and years of experience when joining our waitlist. When using the application,
              we collect campaign change data, metrics, and screenshots you submit through the chat interface.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to provide and improve CampLog services, process campaign data
              through our AI extraction pipeline, send you updates about your waitlist status, and communicate
              about product changes. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using Supabase infrastructure with row-level security policies.
              Campaign screenshots are stored in encrypted cloud storage. We implement industry-standard
              security measures to protect your information from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use OpenAI for AI-powered data extraction from your messages and screenshots. Data sent to
              OpenAI is processed according to their data usage policies. We also use Supabase for authentication
              and database services, and Vercel for application hosting.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, modify, or delete your personal data at any time. You can request
              a copy of your data or request deletion by contacting us. If you are on our waitlist, you can
              request removal at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We do not use tracking or
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this privacy policy or your data, please reach out to us at privacy@camplog.dev.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground/60">
          <p>&copy; 2026 CampLog</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
            <Link href="/" className="hover:text-muted-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
