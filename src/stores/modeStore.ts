import { create } from "zustand";
import { detectAiMode, type AiMode } from "@/lib/tauri";

interface ModeStore {
  mode: AiMode;
  detected: boolean;
  detect: () => Promise<void>;
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: { type: "none" },
  detected: false,
  detect: async () => {
    try {
      const mode = await detectAiMode();
      set({ mode, detected: true });
    } catch (e) {
      console.error("detect ai mode failed", e);
      set({ detected: true });
    }
  },
}));
