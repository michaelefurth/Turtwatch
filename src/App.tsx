import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useStore } from "@/store/useStore";
import { FeedbackProvider } from "@/components/feedback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CloudGate } from "@/components/CloudGate";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/screens/Onboarding";
import { Home } from "@/screens/Home";
import { DailyUpload } from "@/screens/DailyUpload";
import { CalendarScreen } from "@/screens/Calendar";
import { Feed } from "@/screens/Feed";
import { FlipGame } from "@/screens/FlipGame";
import { Mantras } from "@/screens/Mantras";
import { Quest } from "@/screens/Quest";
import { Account } from "@/screens/Account";
import { EntryDetail } from "@/screens/EntryDetail";
import { MissedDayRepair } from "@/screens/MissedDayRepair";
import { Shop } from "@/screens/Shop";
import { FactsLibrary } from "@/screens/FactsLibrary";
import { Profile } from "@/screens/Profile";
import { Friends } from "@/screens/Friends";
import { Settings } from "@/screens/Settings";

function RequireOnboarding({ children }: { children: ReactElement }) {
  const onboarded = useStore((s) => s.onboarded);
  const loc = useLocation();
  if (!onboarded && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  const prefs = useStore((s) => s.prefs);
  const calm = prefs.calmMode;
  const lessMotion = calm || prefs.reduceMotion;

  // reflect comfort prefs as <html> classes so CSS can adapt app-wide
  useEffect(() => {
    const c = document.documentElement.classList;
    c.toggle("calm", calm);
    c.toggle("reduce-motion", lessMotion);
    c.toggle("reduce-transparency", calm || prefs.reduceTransparency);
    c.toggle("high-contrast", prefs.highContrast);
    c.toggle("large-text", prefs.largeText);
  }, [calm, lessMotion, prefs.reduceTransparency, prefs.highContrast, prefs.largeText]);

  return (
    <MotionConfig reducedMotion={lessMotion ? "always" : "user"}>
      <ErrorBoundary>
      <FeedbackProvider>
        <CloudGate>
        <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <RequireOnboarding>
                <AppShell />
              </RequireOnboarding>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<DailyUpload />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/play" element={<FlipGame />} />
            <Route path="/mantras" element={<Mantras />} />
            <Route path="/quest" element={<Quest />} />
            <Route path="/account" element={<Account />} />
            <Route path="/day/:date" element={<EntryDetail />} />
            <Route path="/repair/:date" element={<MissedDayRepair />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/facts" element={<FactsLibrary />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </CloudGate>
      </FeedbackProvider>
      </ErrorBoundary>
    </MotionConfig>
  );
}
