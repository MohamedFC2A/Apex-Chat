import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import { useAuthStore } from "./auth-store";
import { useSubscriptionStore } from "./subscription-store";
import { useChatStore } from "./store";
import type { SubscriptionTier } from "@shared/schema";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authStore = useAuthStore();
  const subscriptionStore = useSubscriptionStore();

  // Sync Firestore user data with local stores
  const syncUserData = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      authStore.setUser(null);
      subscriptionStore.setTier("omni");
      useChatStore.getState().clearStore();
      return;
    }

    const currentUser = authStore.user;
    if (currentUser && currentUser.uid !== firebaseUser.uid) {
      console.log("[AuthProvider] User switched, clearing chat store");
      useChatStore.getState().clearStore();
    }

    try {
      // Check if browser is online before querying Firestore
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        authStore.setUser(firebaseUser, "omni");
        subscriptionStore.setTier("omni");
        return;
      }

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let tier: SubscriptionTier = "omni";
      let walletData: {
        wallet: { balance: number; currency: string };
        subscription: { active: boolean; startDate: string; expiresAt: string; autoRenew: boolean };
        history: any[];
      } | undefined;

      if (userDoc.exists()) {
        const data = userDoc.data();
        tier = "omni"; // Force to omni

        // Fetch wallet data with defaults for existing users
        walletData = {
          wallet: data.wallet || { balance: 0, currency: 'USD' },
          subscription: data.subscription || { active: false, startDate: '', expiresAt: '', autoRenew: false },
          history: data.history || [],
        };
      } else {
        // Create new user document with wallet defaults
        const defaultWalletData = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          tier: "omni",
          createdAt: Date.now(),
          wallet: { balance: 0, currency: 'USD' },
          subscription: { active: false, startDate: '', expiresAt: '', autoRenew: false },
          history: [],
        };
        await setDoc(userDocRef, defaultWalletData);
        walletData = {
          wallet: defaultWalletData.wallet,
          subscription: defaultWalletData.subscription,
          history: defaultWalletData.history,
        };
      }

      authStore.setUser(firebaseUser, "omni", walletData);
      subscriptionStore.setTier("omni");
      
      // CLOUD SYNC: Load chat history from Firestore (background, non-blocking)
      useChatStore.getState().loadFromCloud(firebaseUser.uid).catch((err) => {
        console.warn("[AuthProvider] Cloud chat sync failed:", err);
      });
    } catch (error: any) {
      // CRITICAL: Gracefully handle offline/unavailable errors without crashing
      if (
        error?.code === "unavailable" ||
        error?.code === "failed-precondition" ||
        error?.message?.includes("offline") ||
        error?.message?.includes("client is offline")
      ) {
        authStore.setUser(firebaseUser, "omni");
        subscriptionStore.setTier("omni");
        return;
      }
      authStore.setUser(firebaseUser, "omni");
      subscriptionStore.setTier("omni");
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // CRITICAL: Release UI immediately, don't wait for Firestore
      setUser(firebaseUser);
      setLoading(false);

      // Sync user data in background (non-blocking)
      if (firebaseUser) {
        syncUserData(firebaseUser);
      } else {
        authStore.setUser(null);
        subscriptionStore.setTier("starter");
      }
    });

    // FAIL-SAFE: Force loading to stop after 3 seconds max
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserData(result.user);
    } catch (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserData(result.user);
    } catch (error) {
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }

      await syncUserData(result.user);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (!user) throw new Error("No user logged in");

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName, photoURL });

      // Optimistically update local state first
      const updatedUser = { ...user, displayName, photoURL };
      setUser(updatedUser as FirebaseUser);

      // Update Firestore in background
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        { displayName, photoURL },
        { merge: true }
      );
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      authStore.logout();
      subscriptionStore.setTier("starter");
      useChatStore.getState().clearStore();
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updateUserProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
