"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface UserSite {
  abbreviation: string;
  name: string;
  url: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  onboarding_completed: boolean;
  sites: UserSite[];
}

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // silently fail — middleware handles auth redirects
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
