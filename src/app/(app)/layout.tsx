import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="md:pl-64">
          <Header />
          <main className="pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </div>
      <OnboardingDialog />
    </ProfileProvider>
  );
}
