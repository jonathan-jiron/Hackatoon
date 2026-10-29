"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ToastItem {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

const Ctx = createContext<(text: string, action?: ToastItem["action"]) => void>(() => {});

export const useToast = () => useContext(Ctx);

/** Heuristic 1 and 3: every action gets a visible confirmation, and some can be undone. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((text: string, action?: ToastItem["action"]) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, text, action }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), action ? 7000 : 4000);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-4 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
            <span>{t.text}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run();
                  setItems((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="font-semibold text-sky-300 underline-offset-2 hover:underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
