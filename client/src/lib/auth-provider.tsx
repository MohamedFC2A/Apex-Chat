import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
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
      console.log("[AuthProvider] User switched, clearing chat store");
      useChatStore.getState().clearStore();
    }

    try {
      // Check if browser is online before querying Supabase
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        authStore.setUser(supabaseUser as any, "omni");
        subscriptionStore.setTier("omni");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      let tier: SubscriptionTier = "omni";
      let walletData: {
        wallet: { balance: number; currency: string };
        subscription: { active: boolean; startDate: string; expiresAt: string; autoRenew: boolean };
        history: any[];
      } | undefined;

      if (profile) {
        tier = "omni"; // Force to omni as per original logic
        walletData = {
          wallet: profile.wallet || { balance: 0, currency: 'USD' },
          subscription: profile.subscription || { active: false, startDate: '', expiresAt: '', autoRenew: false },
          history: profile.history || [],
        };
      } else {
        // Create new user profile with wallet defaults
        const defaultWalletData = {
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          display_name: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || "",
          photo_url: supabaseUser.user_metadata?.avatar_url || "",
          tier: "omni",
          created_at: Date.now(),
          wallet: { balance: 0, currency: 'USD' },
          subscription: { active: false, startDate: '', expiresAt: '', autoRenew: false },
          history: [],
        };
        await supabase.from("profiles").insert(defaultWalletData);
        walletData = {
          wallet: defaultWalletData.wallet,
          subscription: defaultWalletData.subscription,
          history: defaultWalletData.history,
        };
      }

      authStore.setUser(supabaseUser as any, "omni", walletData);
      subscriptionStore.setTier("omni");
      
      // CLOUD SYNC: Load chat history from Supabase
      useChatStore.getState().loadFromCloud(supabaseUser.id).catch((err) => {
        console.warn("[AuthProvider] Cloud chat sync failed:", err);
      });
    } catch (error: any) {
      console.error("[AuthProvider] Profile sync error:", error);
      authStore.setUser(supabaseUser as any, "omni");
      subscriptionStore.setTier("omni");
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      setLoading(false);
      if (initialUser) {
        syncUserData(initialUser);
      } else {
        authStore.setUser(null);
        subscriptionStore.setTier("starter");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      setLoading(false);

      if (activeUser) {
        syncUserData(activeUser);
      } else {
        authStore.setUser(null);
        subscriptionStore.setTier("starter");
        useChatStore.getState().clearStore();
      }
    });

    // FAIL-SAFE: Force loading to stop after 3 seconds max
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await syncUserData(data.user);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) throw error;
    if (data.user) {
      await syncUserData(data.user);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (!user) throw new Error("No user logged in");

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: photoURL,
      },
    });
    if (error) throw error;

    if (data.user) {
      setUser(data.user);
      
      // Update profile table
      await supabase.from("profiles").update({
        display_name: displayName,
        photo_url: photoURL
      }).eq("id", user.id);
    }
  };

  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.user) {
      await syncUserData(data.user);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    authStore.logout();
    subscriptionStore.setTier("starter");
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
