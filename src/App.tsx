import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/viewer/PdfViewer";
import { ZoomControls } from "@/components/viewer/ZoomControls";
import { PageNavigation } from "@/components/viewer/PageNavigation";
import { ViewModeSelector } from "@/components/viewer/ViewModeSelector";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SearchDialog } from "@/components/dialogs/SearchDialog";
import { RecentFilesMenu } from "@/components/dialogs/RecentFilesMenu";
import { MenuBar } from "@/components/menu/MenuBar";
import { StatusBar } from "@/components/statusbar/StatusBar";
import { TabBar } from "@/components/tabs/TabBar";
import { AnnotationToolbar } from "@/components/toolbar/AnnotationToolbar";
import { MainToolbar } from "@/components/toolbar/MainToolbar";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAnnotationStore } from "@/stores/annotationStore";
import { openPdf, addRecentFile } from "@/lib/tauri";
import { open } from "@tauri-apps/plugin-dialog";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useDragDrop } from "@/hooks/useDragDrop";
import { FolderOpen, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect } from "react";

function App() {
  const addTab = usePdfStore((s) => s.addTab);
  const closeTab = usePdfStore((s) => s.closeTab);
  const activeTabId = usePdfStore((s) => s.activeTabId);
  const currentPage = usePdfStore((s) => s.currentPage);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const readingMode = useUiStore((s) => s.readingMode);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleReadingMode = useUiStore((s) => s.toggleReadingMode);
  const setSearchDialogOpen = useUiStore((s) => s.setSearchDialogOpen);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadAnnotations = useAnnotationStore((s) => s.load);
  const setTool = useAnnotationStore((s) => s.setTool);
  const selectedAnnId = useAnnotationStore((s) => s.selectedId);
  const removeAnnotation = useAnnotationStore((s) => s.remove);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Load annotations when active tab changes
  useEffect(() => {
    const tab = usePdfStore.getState().getActiveTab();
    if (tab) {
      loadAnnotations(tab.path);
    }
  }, [activeTabId, loadAnnotations]);

  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof selected === "string") {
      try {
        const doc = await openPdf(selected);
        addTab(doc);
        await addRecentFile(selected);
      } catch (e) {
        alert(`Error abriendo PDF: ${e}`);
      }
    }
  };

  const handleSearch = () => setSearchDialogOpen(true);

  const handleCloseTab = () => {
    const tabId = usePdfStore.getState().activeTabId;
    if (tabId) closeTab(tabId);
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
    { key: "w", ctrl: true, handler: handleCloseTab },
    { key: "f", ctrl: true, handler: handleSearch },
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
    // Annotation tool shortcuts
    { key: "h", handler: () => setTool("highlight") },
    { key: "u", handler: () => setTool("underline") },
    { key: "n", handler: () => setTool("note") },
    { key: "p", handler: () => setTool("pen") },
    { key: "s", handler: () => setTool("select") },
    {
      key: "Delete",
      handler: () => {
        if (selectedAnnId) removeAnnotation(selectedAnnId);
      },
    },
  ]);

  useDragDrop(async (paths) => {
    for (const path of paths) {
      try {
        const doc = await openPdf(path);
        addTab(doc);
        await addRecentFile(path);
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
          <MenuBar onOpen={handleOpen} onSearch={handleSearch} />
          <div className="w-px h-6 bg-border" />
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
          <RecentFilesMenu />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSidebar}
            title={
              sidebarVisible ? "Ocultar panel lateral" : "Mostrar panel lateral"
            }
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
            onClick={handleSearch}
            title="Buscar (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <MainToolbar />
          <div className="flex-1" />
          <PageNavigation />
          <div className="w-px h-6 bg-border mx-1" />
          <ViewModeSelector />
          <div className="w-px h-6 bg-border mx-1" />
          <ZoomControls />
        </header>
      )}
      {!readingMode && <TabBar />}
      {!readingMode && activeTabId && <AnnotationToolbar />}
      <main className="flex-1 flex overflow-hidden">
        {!readingMode && sidebarVisible && <Sidebar />}
        <PdfViewer />
      </main>
      {!readingMode && <StatusBar />}
      <SearchDialog />
    </div>
  );
}

export default App;
