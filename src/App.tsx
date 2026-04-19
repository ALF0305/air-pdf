import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/viewer/PdfViewer";
import { ZoomControls } from "@/components/viewer/ZoomControls";
import { PageNavigation } from "@/components/viewer/PageNavigation";
import { ViewModeSelector } from "@/components/viewer/ViewModeSelector";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SearchDialog } from "@/components/dialogs/SearchDialog";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import { openPdf } from "@/lib/tauri";
import { open } from "@tauri-apps/plugin-dialog";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useDragDrop } from "@/hooks/useDragDrop";
import { FolderOpen, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";

function App() {
  const addTab = usePdfStore((s) => s.addTab);
  const currentPage = usePdfStore((s) => s.currentPage);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const readingMode = useUiStore((s) => s.readingMode);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleReadingMode = useUiStore((s) => s.toggleReadingMode);
  const setSearchDialogOpen = useUiStore((s) => s.setSearchDialogOpen);

  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof selected === "string") {
      try {
        const doc = await openPdf(selected);
        addTab(doc);
      } catch (e) {
        alert(`Error abriendo PDF: ${e}`);
      }
    }
  };

  const goToNextPage = () => {
    const tab = usePdfStore.getState().getActiveTab();
    if (tab) {
      setCurrentPage(Math.min(tab.pageCount - 1, currentPage + 1));
    }
  };

  const goToPrevPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
  };

  useShortcuts([
    { key: "o", ctrl: true, handler: handleOpen },
    { key: "f", ctrl: true, handler: () => setSearchDialogOpen(true) },
    { key: "F11", handler: toggleReadingMode },
    { key: "Escape", handler: () => readingMode && toggleReadingMode() },
    { key: "PageDown", handler: goToNextPage },
    { key: "PageUp", handler: goToPrevPage },
    { key: "ArrowRight", handler: goToNextPage },
    { key: "ArrowLeft", handler: goToPrevPage },
    { key: "Home", ctrl: true, handler: () => setCurrentPage(0) },
    {
      key: "End",
      ctrl: true,
      handler: () => {
        const tab = usePdfStore.getState().getActiveTab();
        if (tab) setCurrentPage(tab.pageCount - 1);
      },
    },
  ]);

  useDragDrop(async (paths) => {
    for (const path of paths) {
      try {
        const doc = await openPdf(path);
        addTab(doc);
      } catch (e) {
        console.error("Cannot open dropped file", path, e);
      }
    }
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {!readingMode && (
        <header className="border-b px-2 py-1 flex items-center gap-2">
          <h1 className="text-sm font-semibold px-2">AirPDF</h1>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpen}
            className="gap-1"
            title="Abrir PDF (Ctrl+O)"
          >
            <FolderOpen className="h-4 w-4" />
            Abrir
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSidebar}
            title={sidebarVisible ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            {sidebarVisible ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSearchDialogOpen(true)}
            title="Buscar (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <PageNavigation />
          <div className="w-px h-6 bg-border mx-1" />
          <ViewModeSelector />
          <div className="w-px h-6 bg-border mx-1" />
          <ZoomControls />
        </header>
      )}
      <main className="flex-1 flex overflow-hidden">
        {!readingMode && sidebarVisible && <Sidebar />}
        <PdfViewer />
      </main>
      <SearchDialog />
    </div>
  );
}

export default App;
