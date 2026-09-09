"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh server-owned notification counts only while the app is visible. */
export function NotificationRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return null;
}
