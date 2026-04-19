import { create } from "zustand";
import { loadSettings, saveSettings, type SettingsData } from "@/lib/tauri";

interface SettingsStore {
  settings: SettingsData | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: (s: SettingsData) => Promise<void>;
  update: (partial: Partial<SettingsData>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loaded: false,
  load: async () => {
    try {
      const s = await loadSettings();
      set({ settings: s, loaded: true });
    } catch (e) {
      console.error("load settings failed", e);
      set({ loaded: true });
    }
  },
  save: async (s) => {
    await saveSettings(s);
    set({ settings: s });
  },
  update: async (partial) => {
    const current = get().settings;
    if (!current) return;
    const merged = { ...current, ...partial };
    await get().save(merged);
  },
}));
