import { usePdfStore } from "@/stores/pdfStore";
import { Tab } from "./Tab";

export function TabBar() {
  const tabs = usePdfStore((s) => s.openTabs);
  const activeTabId = usePdfStore((s) => s.activeTabId);
  const setActiveTab = usePdfStore((s) => s.setActiveTab);
  const closeTab = usePdfStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="flex border-b bg-muted/20 overflow-x-auto scrollbar-thin">
      {tabs.map((doc) => (
        <Tab
          key={doc.id}
          doc={doc}
          isActive={doc.id === activeTabId}
          onActivate={() => setActiveTab(doc.id)}
          onClose={() => closeTab(doc.id)}
        />
      ))}
    </div>
  );
}
