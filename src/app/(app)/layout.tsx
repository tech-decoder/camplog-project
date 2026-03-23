"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { CommandPalette } from "@/components/chrome/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="md:pl-64">
          <Header onOpenCommandPalette={() => setCommandOpen(true)} />
          <main className="px-4 py-6 pb-20 sm:px-6 sm:pt-8 lg:px-8 md:pb-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <OnboardingDialog />
    </ProfileProvider>
  );
}
