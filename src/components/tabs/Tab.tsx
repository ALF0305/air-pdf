import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { clsx } from "clsx";
import type { PdfDocument } from "@/types/pdf";

interface Props {
  doc: PdfDocument;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export function Tab({ doc, isActive, onActivate, onClose }: Props) {
  const filename = doc.path.split(/[\\/]/).pop() ?? doc.path;

  return (
    <div
      className={clsx(
        "flex items-center gap-1 px-3 py-1.5 border-r cursor-pointer text-sm max-w-[220px] select-none",
        isActive
          ? "bg-background border-b-0 font-medium"
          : "bg-muted/40 hover:bg-accent"
      )}
      onClick={onActivate}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
      title={doc.path}
    >
      <span className="truncate flex-1">
        {filename}
        {doc.isModified && " *"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar tab"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
