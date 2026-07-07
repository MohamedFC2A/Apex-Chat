import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { useAuthStore } from "./auth-store";
import { useSubscriptionStore } from "./subscription-store";
import { useChatStore } from "./store";
import type { SubscriptionTier } from "@shared/schema";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authStore = useAuthStore();
  const subscriptionStore = useSubscriptionStore();

  // Sync user data with local stores
  const syncUserData = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      authStore.setUser(null);
      subscriptionStore.setTier("omni");
      useChatStore.getState().clearStore();
      return;
    }

    const currentUser = authStore.user;
    if (currentUser && currentUser.uid !== supabaseUser.id) {
      useChatStore.getState().clearStore();
    }

    try {
      // Force tier to OMNI for all users
      const tier: SubscriptionTier = "omni";
      
      let walletData: {
        wallet: { balance: number; currency: string };
        subscription: { active: boolean; startDate: string; expiresAt: string; autoRenew: boolean };
        history: any[];
      } | undefined;

      let profile: any = null;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", supabaseUser.id)
            .single();
          if (!error) profile = data;
        } catch (dbErr) {
          console.warn("[AuthProvider] Profile DB fetch failed, using local storage fallback:", dbErr);
        }
      }

      // Local storage fallback for profiles
      if (!profile) {
        const localProfiles = JSON.parse(localStorage.getItem("apex_profiles") || "{}");
        profile = localProfiles[supabaseUser.id];

        if (!profile) {
          profile = {
            id: supabaseUser.id,
            email: supabaseUser.email || "",
            display_name: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || "",
            photo_url: supabaseUser.user_metadata?.avatar_url || "",
            tier: "omni",
            created_at: Date.now(),
            wallet: { balance: 1000, currency: 'USD' },
            subscription: { active: true, startDate: new Date().toISOString(), expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString(), autoRenew: true },
            history: [],
          };
          localProfiles[supabaseUser.id] = profile;
          localStorage.setItem("apex_profiles", JSON.stringify(localProfiles));
        }
      }

      // Ensure tier is OMNI and subscription/wallet are generous
      profile.tier = "omni";
      if (!profile.wallet || profile.wallet.balance < 1000) {
        profile.wallet = { balance: Math.max(profile.wallet?.balance || 0, 1000), currency: profile.wallet?.currency || 'USD' };
      }
      if (!profile.subscription || !profile.subscription.active) {
        profile.subscription = { active: true, startDate: new Date().toISOString(), expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString(), autoRenew: true };
      }

      // Update database profile if possible in the background
      if (isSupabaseConfigured) {
        supabase
          .from("profiles")
          .update({
            tier: "omni",
            wallet: profile.wallet,
            subscription: profile.subscription,
          })
          .eq("id", supabaseUser.id)
          .then(({ error }) => {
            if (error) console.warn("[AuthProvider] Background profile update failed:", error);
          });
      }

      walletData = {
        wallet: profile.wallet,
        subscription: profile.subscription,
        history: profile.history || [],
      };

      authStore.setUser(supabaseUser, tier, walletData);
      subscriptionStore.setTier(tier);
      
      // CLOUD SYNC: Load chat history from Supabase if configured
      if (isSupabaseConfigured) {
        useChatStore.getState().loadFromCloud(supabaseUser.id).catch((err) => {
          console.warn("[AuthProvider] Cloud chat sync failed:", err);
        });
      }
    } catch (error: any) {
      console.error("[AuthProvider] Profile sync error:", error);
      authStore.setUser(supabaseUser, "omni", {
        wallet: { balance: 1000, currency: 'USD' },
        subscription: { active: true, startDate: new Date().toISOString(), expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString(), autoRenew: true },
        history: [],
      });
      subscriptionStore.setTier("omni");
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const useMockSession = () => {
      const storedUser = localStorage.getItem("apex_current_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          syncUserData(parsed);
        } catch (e) {
          setUser(null);
          syncUserData(null);
        }
      } else {
        setUser(null);
        syncUserData(null);
      }
      setLoading(false);
    };

    if (isSupabaseConfigured) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const initialUser = session?.user ?? null;
        setUser(initialUser);
        setLoading(false);
        if (initialUser) {
          syncUserData(initialUser);
        } else {
          // If no supabase session, fallback to check mock session
          useMockSession();
        }
      }).catch(err => {
        console.warn("[AuthProvider] Supabase getSession failed, falling back to mock session:", err);
        useMockSession();
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        setLoading(false);

        if (activeUser) {
          syncUserData(activeUser);
        } else {
          // If logged out of Supabase, check if mock user exists
          const storedUser = localStorage.getItem("apex_current_user");
          if (storedUser) {
            useMockSession();
          } else {
            authStore.setUser(null);
            subscriptionStore.setTier("omni");
            useChatStore.getState().clearStore();
          }
        }
      });

      timeoutId = setTimeout(() => {
        setLoading(false);
      }, 3000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeoutId);
      };
    } else {
      // Running in purely mock auth mode
      useMockSession();
    }
  }, []);

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } else {
      // Mock Google Login
      await signInAnonymously();
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return;
        throw error;
      } catch (err: any) {
        console.warn("[AuthProvider] Supabase sign-in failed, trying local accounts database:", err);
      }
    }

    // Local Storage Mock Login
    const accounts = JSON.parse(localStorage.getItem("apex_accounts") || "[]");
    const foundIdx = accounts.findIndex((acc: any) => acc.email.toLowerCase() === email.toLowerCase());
    
    if (foundIdx === -1) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    const found = accounts[foundIdx];
    const hashedPassword = await hashPassword(password);

    let passwordMatch = false;
    let needsUpgrade = false;

    if (found.password === password) {
      // Old plain-text password match -> needs upgrade
      passwordMatch = true;
      needsUpgrade = true;
    } else if (found.password === hashedPassword) {
      // Hashed password match
      passwordMatch = true;
    }

    if (!passwordMatch) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    // Upgrade to hashed password on successful login
    if (needsUpgrade) {
      found.password = hashedPassword;
      accounts[foundIdx] = found;
      localStorage.setItem("apex_accounts", JSON.stringify(accounts));
    }

    const mockUser = {
      id: found.id,
      email: found.email,
      user_metadata: { display_name: found.displayName },
      created_at: found.createdAt,
    } as any;

    localStorage.setItem("apex_current_user", JSON.stringify(mockUser));
    setUser(mockUser);
    await syncUserData(mockUser);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (!error) return;
        throw error;
      } catch (err: any) {
        console.warn("[AuthProvider] Supabase sign-up failed, trying local registration:", err);
      }
    }

    // Local Storage Mock Registration
    const accounts = JSON.parse(localStorage.getItem("apex_accounts") || "[]");
    const exists = accounts.some((acc: any) => acc.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      throw new Error("البريد الإلكتروني مستخدم بالفعل.");
    }

    const hashedPassword = await hashPassword(password);

    const newAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password: hashedPassword,
      displayName: displayName || email.split("@")[0],
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    localStorage.setItem("apex_accounts", JSON.stringify(accounts));

    const mockUser = {
      id: newAccount.id,
      email: newAccount.email,
      user_metadata: { display_name: newAccount.displayName },
      created_at: newAccount.createdAt,
    } as any;

    localStorage.setItem("apex_current_user", JSON.stringify(mockUser));
    setUser(mockUser);
    await syncUserData(mockUser);
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    }
  };

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { display_name: displayName, avatar_url: photoURL },
        });
        if (!error) return;
      } catch (err) {
        console.warn("[AuthProvider] Supabase profile update failed, syncing locally:", err);
      }
    }

    // Sync updated data locally
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          display_name: displayName || user.user_metadata?.display_name,
          avatar_url: photoURL || user.user_metadata?.avatar_url,
        }
      };
      localStorage.setItem("apex_current_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      await syncUserData(updatedUser);
    }
  };

  const signInAnonymously = async () => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInAnonymously();
        if (!error) return;
        throw error;
      } catch (err: any) {
        console.warn("[AuthProvider] Supabase anonymous sign-in failed, using local guest session:", err);
      }
    }

    const mockUser = {
      id: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: null,
      user_metadata: { display_name: "ضيف" },
      created_at: new Date().toISOString(),
    } as any;

    localStorage.setItem("apex_current_user", JSON.stringify(mockUser));
    setUser(mockUser);
    await syncUserData(mockUser);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[AuthProvider] Supabase signOut error:", err);
      }
    }
    
    localStorage.removeItem("apex_current_user");
    setUser(null);
    authStore.logout();
    subscriptionStore.setTier("omni");
    useChatStore.getState().clearStore();
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAnonymously,
    resetPassword,
    updateUserProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
