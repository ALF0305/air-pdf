export interface Settings {
  general: {
    defaultViewMode: "single" | "double" | "continuous";
    defaultZoom: "fit-width" | "fit-page" | "100" | number;
    recentFilesLimit: number;
  };
  annotations: {
    storageMode: "sidecar" | "embedded";
    syncToDropbox: boolean;
    defaultAuthor: string;
  };
  ai: {
    mode: "auto" | "off" | "cloud" | "local";
    confirmBeforeCloud: boolean;
  };
  shortcuts: Record<string, string>;
}
