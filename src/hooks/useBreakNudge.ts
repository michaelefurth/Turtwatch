import { useRef } from "react";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";

/**
 * Gentle hyperfocus support: after `threshold` repetitions of an activity in one
 * sitting, suggest (once) that a break is okay too. Opt-out via prefs.breakNudges.
 * Returns a function to call after each completed round/session.
 */
export function useBreakNudge(activity: string, threshold = 5) {
  const { toast } = useFeedback();
  const count = useRef(0);
  const nudged = useRef(false);
  return () => {
    count.current += 1;
    if (useStore.getState().prefs.breakNudges === false || nudged.current) return;
    if (count.current >= threshold) {
      nudged.current = true;
      toast(`You've done a lot of ${activity} — a break is lovely too 🌿`, "🫧");
    }
  };
}
