import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";

interface Props {
  onOpen: () => void;
  onSearch: () => void;
}

export function MenuBar({ onOpen, onSearch }: Props) {
  const closeTab = usePdfStore((s) => s.closeTab);
  const activeTabId = usePdfStore((s) => s.activeTabId);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleReadingMode = useUiStore((s) => s.toggleReadingMode);
  const setViewMode = usePdfStore((s) => s.setViewMode);

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Archivo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onOpen}>
            Abrir...
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => activeTabId && closeTab(activeTabId)}
            disabled={!activeTabId}
          >
            Cerrar pestaña
            <DropdownMenuShortcut>Ctrl+W</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onSearch}>
            Buscar...
            <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Ver
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={toggleSidebar}>
            Alternar barra lateral
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleReadingMode}>
            Modo lectura
            <DropdownMenuShortcut>F11</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setViewMode("single")}>
            Una página
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewMode("double")}>
            Dos páginas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewMode("continuous")}>
            Continuo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
