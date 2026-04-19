import { useEffect } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
}

export function useShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      for (const sc of shortcuts) {
        if (
          e.key.toLowerCase() === sc.key.toLowerCase() &&
          !!sc.ctrl === e.ctrlKey &&
          !!sc.shift === e.shiftKey &&
          !!sc.alt === e.altKey
        ) {
          e.preventDefault();
          sc.handler(e);
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
