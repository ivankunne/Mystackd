"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAppearancePrefs, type AppearancePrefs } from "@/lib/data/appearance-prefs";

const DEFAULTS: AppearancePrefs = {
  dateFormat:      "DD/MM/YYYY",
  numberFormat:    "1,000.00",
  weekStart:       "monday",
  fiscalYearStart: "january",
};

const AppearanceContext = createContext<AppearancePrefs>(DEFAULTS);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULTS);

  useEffect(() => {
    getAppearancePrefs().then(setPrefs).catch(() => {});
  }, []);

  return (
    <AppearanceContext.Provider value={prefs}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearancePrefs {
  return useContext(AppearanceContext);
}
