import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    // In dev, unregister to avoid SW caching bundles/HMR traffic.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length) {
        regs.forEach((reg) => reg.unregister());
        if (window.caches) {
          caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
        }
        if (navigator.serviceWorker.controller && !sessionStorage.getItem("sw-reload")) {
          sessionStorage.setItem("sw-reload", "1");
          window.location.reload();
        }
      }
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((err) => console.error("SW registration failed", err));
    });
  }
}
