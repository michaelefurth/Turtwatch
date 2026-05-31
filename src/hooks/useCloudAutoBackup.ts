import { useEffect, useRef } from "react";
import { useStore, getPersistableState } from "@/store/useStore";
import * as cloud from "@/lib/cloud";

/**
 * When the user is signed in and auto-backup is on, debounce-pushes meaningful
 * changes to the cloud. A content signature prevents backup loops (re-hydrating
 * the URL-ified snapshot doesn't change the signature).
 */
export function useCloudAutoBackup() {
  const sigRef = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloud.isSupabaseEnabled) return;
    const unsub = useStore.subscribe(() => {
      const s = useStore.getState();
      if (!s.cloud?.autoBackup || !cloud.currentUser()) return;
      const sig = cloud.contentSignature(s);
      if (sig === sigRef.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const cur = getPersistableState();
        const curSig = cloud.contentSignature(cur);
        if (curSig === sigRef.current) return;
        try {
          const snap = await cloud.backup(cur);
          // advance the signature only AFTER a successful backup, so a failed
          // attempt is retried on the next change instead of being lost
          sigRef.current = curSig;
          useStore.getState().hydrateState(snap);
          useStore.getState().setCloud({ lastBackupAt: new Date().toISOString() });
        } catch {
          /* offline / transient — sigRef unchanged, retry on next change */
        }
      }, 5000);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
