"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type User, type Expense } from "../mock-data";
import * as auth from "../auth";
import { createClient } from "../supabase/client";
import { setCurrentUserId, loadList } from "../storage";
import { createExpense } from "../data/expenses";

// Maps a Supabase profiles row (snake_case) to the app's User type (camelCase)
function dbToUser(p: Record<string, unknown>, email: string): User {
  return {
    id:                 p.id as string,
    name:               (p.name as string) ?? "",
    email:              (p.email as string) ?? email,
    currency:           (p.currency as User["currency"]) ?? "EUR",
    country:            (p.country as string) ?? "NO",
    monthlyExpenses:    (p.monthly_expenses as User["monthlyExpenses"]) ?? { rent: 0, subscriptions: 0, other: 0 },
    taxBracket:         (p.tax_bracket as number) ?? 0.33,
    isPro:              (p.is_pro as boolean) ?? false,
    emailVerified:      (p.email_verified as boolean) ?? false,
    incomeGoal:         p.income_goal as number | undefined,
    referralCode:       p.referral_code as string | undefined,
    publicPageEnabled:  (p.public_page_enabled as boolean) ?? false,
    publicPageSlug:     p.public_page_slug as string | undefined,
    phone:              p.phone as string | undefined,
    website:            p.website as string | undefined,
    bio:                p.bio as string | undefined,
    language:           p.language as string | undefined,
  };
}

// Migrate pre-login expenses from global localStorage to the user's account
async function migratePreLoginExpenses(userId: string, currency: User["currency"]): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const preLoginExpenses = loadList<Expense>("expenses", []);

    if (preLoginExpenses.length === 0) return;

    // Set the user ID so subsequent operations are scoped to this user
    setCurrentUserId(userId);

    // Create all pre-login expenses under the user's account
    for (const expense of preLoginExpenses) {
      await createExpense({
        userId,
        date: expense.date,
        amount: expense.amount,
        currency: expense.currency || currency,
        category: expense.category,
        description: expense.description,
        vendor: expense.vendor,
        isTaxDeductible: expense.isTaxDeductible,
        isRecurring: expense.isRecurring,
        recurringId: expense.recurringId,
      });
    }

    // Clear pre-login expenses from global localStorage
    localStorage.removeItem("ms_expenses");
  } catch (error) {
    console.error("Failed to migrate pre-login expenses:", error);
  }
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full profile from Supabase profiles table.
  // Falls back to a minimal user built from the auth session so the app
  // remains functional even before the DB schema / trigger is set up.
  async function fetchProfile(userId: string, email: string): Promise<User> {
    const fallback: User = {
      id: userId,
      name: email.split("@")[0],
      email,
      currency: "EUR",
      country: "NO",
      monthlyExpenses: { rent: 0, subscriptions: 0, other: 0 },
      taxBracket: 0.33,
      isPro: false,
      emailVerified: false,
    };
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error || !data) return fallback;
      return dbToUser(data, email);
    } catch {
      return fallback;
    }
  }

  // Listen for Supabase auth state changes (login, logout, token refresh, OAuth callback)
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email!);
        setUser(profile);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email!);
        // Migrate pre-login expenses if this is a sign-in event
        if (event === "SIGNED_IN") {
          await migratePreLoginExpenses(session.user.id, profile.currency);
        }
        setCurrentUserId(session.user.id);
        setUser(profile);
      } else if (event === "SIGNED_OUT") {
        // Only clear the user on an explicit sign-out, not on missing session
        // (e.g. email confirmation pending after signup)
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authUser = await auth.login({ email, password });
      const profile = await fetchProfile(authUser.id, authUser.email);
      await migratePreLoginExpenses(authUser.id, profile.currency);
      setCurrentUserId(authUser.id);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const authUser = await auth.signup({ name, email, password });
      const profile = await fetchProfile(authUser.id, authUser.email);
      await migratePreLoginExpenses(authUser.id, profile.currency);
      setCurrentUserId(authUser.id);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await auth.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    await auth.loginWithGoogle();
    // Supabase redirects the browser — onAuthStateChange handles the rest
  };

  // Optimistic local update — persisted to DB via updateUserProfile() in lib/data/user.ts
  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Refresh user data from Supabase (useful after subscription changes)
  const refreshUser = async () => {
    if (!user) return;
    try {
      const profile = await fetchProfile(user.id, user.email);
      setUser(profile);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, loginWithGoogle, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
