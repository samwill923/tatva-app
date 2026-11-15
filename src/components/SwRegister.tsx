"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds only, so it never caches dev assets. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
