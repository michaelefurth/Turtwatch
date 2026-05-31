import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TabBar } from "./TabBar";
import { useFeedback } from "./feedback";
import { useStore } from "@/store/useStore";
import { themeById } from "@/data/shopItems";
import { useReminders } from "@/hooks/useReminders";

/** Decorative pond background — drifting bubbles + ripples. */
function PondDecor() {
  const bubbles = Array.from({ length: 9 });
  return (
    <div className="pond-decor" aria-hidden>
      {bubbles.map((_, i) => {
        const size = 8 + ((i * 7) % 26);
        return (
          <span
            key={i}
            className="bubble"
            style={{
              left: `${(i * 11 + 4) % 96}%`,
              bottom: `-${size}px`,
              width: size,
              height: size,
              animationDuration: `${8 + (i % 5) * 3}s`,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        );
      })}
      <span className="ripple" style={{ left: "12%", top: "30%", width: 90, height: 90 }} />
      <span className="ripple" style={{ right: "8%", top: "55%", width: 70, height: 70, animationDelay: "2.5s" }} />
    </div>
  );
}

export function AppShell() {
  const themeId = useStore((s) => s.profile.themeId);
  const loc = useLocation();
  const { toast } = useFeedback();
  useReminders();

  // surface persistence failures (e.g. storage quota from large photos)
  useEffect(() => {
    const onErr = () => toast("Couldn't save — storage is full 😬", "💾");
    window.addEventListener("turtwatch:storage-error", onErr);
    return () => window.removeEventListener("turtwatch:storage-error", onErr);
  }, [toast]);

  // apply theme palette as CSS custom properties
  useEffect(() => {
    const t = themeById(themeId);
    const root = document.documentElement;
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--surface", t.surface);
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-deep", t.primaryDeep);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--text", t.text);
  }, [themeId]);

  // scroll to top on route change
  useEffect(() => {
    document.querySelector(".app")?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="app">
      <PondDecor />
      <Outlet />
      <TabBar />
    </div>
  );
}
