import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Checks GitHub Releases for a new version at startup. If found, prompts the
 * user and installs + relaunches on confirm. Silent on errors (offline, no
 * release yet, etc.) to avoid disrupting normal usage.
 */
export function useUpdateCheck() {
  useEffect(() => {
    const run = async () => {
      try {
        const update = await check();
        if (!update) return;

        const msg = `AirPDF ${update.version} está disponible.\n\nVersión actual: ${update.currentVersion}\nLanzamiento: ${update.date ?? "desconocido"}\n\n${update.body ?? ""}\n\n¿Descargar e instalar ahora?`;
        if (!confirm(msg)) return;

        await update.downloadAndInstall();
        await relaunch();
      } catch (e) {
        // Silent fail — no network, no release, etc.
        console.warn("Update check failed:", e);
      }
    };
    // Delay 5s so the app is stable before networking
    const t = window.setTimeout(run, 5000);
    return () => window.clearTimeout(t);
  }, []);
}
