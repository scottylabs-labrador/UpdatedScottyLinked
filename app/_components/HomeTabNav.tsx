"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { HomeTab } from "@/lib/homeTab";
import { tabFromSearchString } from "@/lib/homeTab";

export type { HomeTab };

function replaceHomeUrl(tab: HomeTab) {
  const params = new URLSearchParams(window.location.search);
  if (tab === "feed") params.delete("tab");
  else params.set("tab", tab);
  const qs = params.toString();
  const path = qs ? `/?${qs}` : "/";
  window.history.replaceState(window.history.state, "", path);
}

type Ctx = {
  activeHomeTab: HomeTab;
  setHomeTab: (tab: HomeTab) => void;
};

const HomeTabContext = createContext<Ctx | null>(null);

export function useHomeTab(): Ctx {
  const c = useContext(HomeTabContext);
  if (!c) throw new Error("useHomeTab must be used within HomeTabNavProvider");
  return c;
}

/**
 * Client-only tab state for `/` so changing ?tab= does not trigger a server navigation.
 * Initial tab comes from middleware + layout (SSR-safe). Syncs URL via replaceState.
 */
export function HomeTabNavProvider({
  children,
  initialHomeTab,
}: {
  children: React.ReactNode;
  initialHomeTab: HomeTab;
}) {
  const pathname = usePathname();
  const [clientTab, setClientTab] = useState<HomeTab>(initialHomeTab);

  useEffect(() => {
    if (pathname !== "/") return;
    setClientTab(tabFromSearchString(window.location.search));
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== "opportunities") return;
    setClientTab("groups");
    params.set("tab", "groups");
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `/?${qs}` : "/");
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname !== "/") return;
      setClientTab(tabFromSearchString(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setHomeTab = useCallback(
    (tab: HomeTab) => {
      if (pathname !== "/") return;
      setClientTab(tab);
      replaceHomeUrl(tab);
    },
    [pathname]
  );

  const value = useMemo<Ctx>(
    () => ({ activeHomeTab: clientTab, setHomeTab }),
    [clientTab, setHomeTab]
  );

  return (
    <HomeTabContext.Provider value={value}>{children}</HomeTabContext.Provider>
  );
}
