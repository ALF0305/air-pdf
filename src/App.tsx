import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/viewer/PdfViewer";
import { ZoomControls } from "@/components/viewer/ZoomControls";
import { PageNavigation } from "@/components/viewer/PageNavigation";
import { ViewModeSelector } from "@/components/viewer/ViewModeSelector";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SearchDialog } from "@/components/dialogs/SearchDialog";
import { RecentFilesMenu } from "@/components/dialogs/RecentFilesMenu";
import { MergePdfsDialog } from "@/components/dialogs/MergePdfsDialog";
import { SplitExtractDialog } from "@/components/dialogs/SplitExtractDialog";
import { MetadataDialog } from "@/components/dialogs/MetadataDialog";
import { CompressDialog } from "@/components/dialogs/CompressDialog";
import { ExportImagesDialog } from "@/components/dialogs/ExportImagesDialog";
import { ImagesToPdfDialog } from "@/components/dialogs/ImagesToPdfDialog";
import { WatermarkDialog } from "@/components/dialogs/WatermarkDialog";
import { PageNumbersDialog } from "@/components/dialogs/PageNumbersDialog";
import { GotoDialog } from "@/components/dialogs/GotoDialog";
import { CropDialog } from "@/components/dialogs/CropDialog";
import { StampImageDialog } from "@/components/dialogs/StampImageDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { StampPresetDialog } from "@/components/dialogs/StampPresetDialog";
import { VersionsDialog } from "@/components/dialogs/VersionsDialog";
import { BookmarksDialog } from "@/components/dialogs/BookmarksDialog";
import { ComparePdfDialog } from "@/components/dialogs/ComparePdfDialog";
import { FormFieldsDialog } from "@/components/dialogs/FormFieldsDialog";
import { OcrDialog } from "@/components/dialogs/OcrDialog";
import { AiDialog } from "@/components/dialogs/AiDialog";
import { AddTextDialog } from "@/components/dialogs/AddTextDialog";
import { PasswordDialog } from "@/components/dialogs/PasswordDialog";
import { SanitizeDialog } from "@/components/dialogs/SanitizeDialog";
import { AutoRedactDialog } from "@/components/dialogs/AutoRedactDialog";
import { BlankPagesDialog } from "@/components/dialogs/BlankPagesDialog";
import { PrintDialog } from "@/components/dialogs/PrintDialog";
import { FontInspectorDialog } from "@/components/dialogs/FontInspectorDialog";
import { MenuBar } from "@/components/menu/MenuBar";
import { StatusBar } from "@/components/statusbar/StatusBar";
import { TabBar } from "@/components/tabs/TabBar";
import { AnnotationToolbar } from "@/components/toolbar/AnnotationToolbar";
import { MainToolbar } from "@/components/toolbar/MainToolbar";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAnnotationStore } from "@/stores/annotationStore";
import { openPdfFlow } from "@/lib/openPdfFlow";
import { open } from "@tauri-apps/plugin-dialog";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useDragDrop } from "@/hooks/useDragDrop";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { FolderOpen, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

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
  const setToolDialog = useUiStore((s) => s.setToolDialog);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadAnnotations = useAnnotationStore((s) => s.load);
  const setTool = useAnnotationStore((s) => s.setTool);
  const selectedAnnId = useAnnotationStore((s) => s.selectedId);
  const removeAnnotation = useAnnotationStore((s) => s.remove);
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);

  // Apply dark mode class to html
  useEffect(() => {
    const el = document.documentElement;
    if (darkMode) el.classList.add("dark");
    else el.classList.remove("dark");
  }, [darkMode]);

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
      const doc = await openPdfFlow(selected);
      if (doc) addTab(doc);
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
    { key: "g", ctrl: true, handler: () => setToolDialog("goto") },
    { key: "F1", handler: () => setToolDialog("shortcuts") },
    { key: "d", ctrl: true, shift: true, handler: toggleDarkMode },
    { key: "z", ctrl: true, handler: () => setToolDialog("versions") },
    { key: "t", ctrl: true, handler: () => setToolDialog("addText") },
    {
      key: "p",
      ctrl: true,
      handler: () => {
        const tab = usePdfStore.getState().getActiveTab();
        if (tab) setToolDialog("print");
      },
    },
    {
      key: "l",
      ctrl: true,
      handler: () => useUiStore.getState().togglePresentation(),
    },
    {
      key: "=",
      ctrl: true,
      handler: () => {
        const z = usePdfStore.getState().zoom;
        const n = typeof z === "number" ? z : 1;
        usePdfStore.getState().setZoom(Math.min(5, +(n + 0.15).toFixed(2)));
      },
    },
    {
      key: "+",
      ctrl: true,
      handler: () => {
        const z = usePdfStore.getState().zoom;
        const n = typeof z === "number" ? z : 1;
        usePdfStore.getState().setZoom(Math.min(5, +(n + 0.15).toFixed(2)));
      },
    },
    {
      key: "-",
      ctrl: true,
      handler: () => {
        const z = usePdfStore.getState().zoom;
        const n = typeof z === "number" ? z : 1;
        usePdfStore.getState().setZoom(Math.max(0.25, +(n - 0.15).toFixed(2)));
      },
    },
    {
      key: "0",
      ctrl: true,
      handler: () => usePdfStore.getState().setZoom(1),
    },
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

  useAutoSave();
  useUpdateCheck();

  useDragDrop(async (paths) => {
    for (const path of paths) {
      try {
        const doc = await openPdfFlow(path);
        if (doc) addTab(doc);
      } catch (e) {
        console.error("Cannot open dropped file", path, e);
      }
    }
  });

  // Recibir PDFs desde CLI / file association: cuando Windows lanza
  // air-pdf.exe "C:\ruta\a.pdf" (doble-click en explorador, "Abrir con",
  // o segunda instancia detectada por single-instance), el backend emite
  // este evento con la lista de paths.
  useEffect(() => {
    const unlistenPromise = listen<string[]>("open-pdf-from-cli", async (event) => {
      const paths = event.payload;
      for (const path of paths) {
        try {
          const doc = await openPdfFlow(path);
          if (doc) addTab(doc);
        } catch (e) {
          console.error("Cannot open file from CLI", path, e);
        }
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [addTab]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {!readingMode && (
        <header className="border-b px-2 py-1 flex items-center gap-2 bg-muted/60">
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
      <MergeDialogMount />
      <SplitDialogMount />
      <ToolDialogMount />
    </div>
  );
}

function ToolDialogMount() {
  const dialog = useUiStore((s) => s.toolDialog);
  const setDialog = useUiStore((s) => s.setToolDialog);
  const close = () => setDialog(null);
  if (dialog === "metadata") return <MetadataDialog open={true} onClose={close} />;
  if (dialog === "compress") return <CompressDialog open={true} onClose={close} />;
  if (dialog === "exportImages") return <ExportImagesDialog open={true} onClose={close} />;
  if (dialog === "imagesToPdf") return <ImagesToPdfDialog open={true} onClose={close} />;
  if (dialog === "watermark") return <WatermarkDialog open={true} onClose={close} />;
  if (dialog === "pageNumbers") return <PageNumbersDialog open={true} onClose={close} />;
  if (dialog === "goto") return <GotoDialog open={true} onClose={close} />;
  if (dialog === "crop") return <CropDialog open={true} onClose={close} />;
  if (dialog === "stamp") return <StampImageDialog open={true} onClose={close} />;
  if (dialog === "about") return <AboutDialog open={true} onClose={close} />;
  if (dialog === "shortcuts") return <ShortcutsDialog open={true} onClose={close} />;
  if (dialog === "stampPreset") return <StampPresetDialog open={true} onClose={close} />;
  if (dialog === "versions") return <VersionsDialog open={true} onClose={close} />;
  if (dialog === "bookmarks") return <BookmarksDialog open={true} onClose={close} />;
  if (dialog === "comparePdf") return <ComparePdfDialog open={true} onClose={close} />;
  if (dialog === "formFields") return <FormFieldsDialog open={true} onClose={close} />;
  if (dialog === "ocr") return <OcrDialog open={true} onClose={close} />;
  if (dialog === "ai") return <AiDialog open={true} onClose={close} />;
  if (dialog === "addText") return <AddTextDialog open={true} onClose={close} />;
  if (dialog === "password") return <PasswordDialog open={true} onClose={close} />;
  if (dialog === "sanitize") return <SanitizeDialog open={true} onClose={close} />;
  if (dialog === "autoRedact") return <AutoRedactDialog open={true} onClose={close} />;
  if (dialog === "blankPages") return <BlankPagesDialog open={true} onClose={close} />;
  if (dialog === "print") return <PrintDialog open={true} onClose={close} />;
  if (dialog === "fontInspector") return <FontInspectorDialog open={true} onClose={close} />;
  return null;
}

function MergeDialogMount() {
  const open = useUiStore((s) => s.mergeDialogOpen);
  const setOpen = useUiStore((s) => s.setMergeDialogOpen);
  return <MergePdfsDialog open={open} onClose={() => setOpen(false)} />;
}

function SplitDialogMount() {
  const mode = useUiStore((s) => s.splitExtractDialog);
  const setMode = useUiStore((s) => s.setSplitExtractDialog);
  if (!mode) return null;
  return (
    <SplitExtractDialog
      open={true}
      onClose={() => setMode(null)}
      mode={mode}
    />
  );
}

export default App;
