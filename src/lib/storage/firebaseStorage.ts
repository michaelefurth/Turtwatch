import type { ImageStorage } from "./types";
import type { FirebaseApp } from "firebase/app";
import type { FirebaseStorage } from "firebase/storage";

// Firebase Storage adapter. Firebase is imported lazily so it never weighs down
// the default (local) build. Configure with VITE_FIREBASE_* env vars.

let appPromise: Promise<{ app: FirebaseApp; storage: FirebaseStorage }> | null = null;

async function ensureFirebase() {
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getStorage } = await import("firebase/storage");
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
      const app = getApps()[0] ?? initializeApp(config);
      return { app, storage: getStorage(app) };
    })();
  }
  return appPromise;
}

export class FirebaseImageStorage implements ImageStorage {
  async upload(key: string, data: Blob): Promise<string> {
    const { storage } = await ensureFirebase();
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const r = ref(storage, `turtles/${key}.jpg`);
    await uploadBytes(r, data, { contentType: data.type || "image/jpeg" });
    return getDownloadURL(r);
  }

  async remove(key: string): Promise<void> {
    const { storage } = await ensureFirebase();
    const { ref, deleteObject } = await import("firebase/storage");
    try {
      await deleteObject(ref(storage, `turtles/${key}.jpg`));
    } catch {
      /* ignore missing object */
    }
  }
}
