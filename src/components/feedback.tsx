import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastMsg {
  id: string;
  text: string;
  emoji?: string;
}

interface FeedbackApi {
  toast: (text: string, emoji?: string) => void;
  celebrate: (emojis?: string[]) => void;
}

const Ctx = createContext<FeedbackApi | null>(null);

const CONFETTI = ["🐢", "🎉", "✨", "🪙", "💚", "🫧", "🌿", "🌸", "🐠", "🍀", "💛", "🌊"];

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confetti, setConfetti] = useState<{ id: string; items: string[] } | null>(null);

  const toast = useCallback((text: string, emoji?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const celebrate = useCallback((emojis?: string[]) => {
    const id = Math.random().toString(36).slice(2);
    const items = Array.from({ length: 26 }, () => {
      const pool = emojis && emojis.length ? emojis : CONFETTI;
      return pool[Math.floor(Math.random() * pool.length)];
    });
    setConfetti({ id, items });
    setTimeout(() => setConfetti((c) => (c?.id === id ? null : c)), 1700);
  }, []);

  return (
    <Ctx.Provider value={{ toast, celebrate }}>
      {children}
      {confetti && (
        <div className="celebrate" aria-hidden>
          {confetti.items.map((e, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                left: `${(i / confetti.items.length) * 100}%`,
                animationDelay: `${(i % 8) * 0.07}s`,
                ["--dx" as string]: `${((i % 5) - 2) * 42}px`,
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}
      {toasts.length > 0 && (
        <div className="toast-wrap" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              {t.emoji && <span aria-hidden>{t.emoji}</span>}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
}
