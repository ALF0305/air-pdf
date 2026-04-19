import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Stamp {
  id: string;
  label: string;
  color: string;
  bg: string;
}

const STAMPS: Stamp[] = [
  { id: "approved", label: "APROBADO", color: "#FFFFFF", bg: "#4CAF50" },
  { id: "reviewed", label: "REVISADO", color: "#FFFFFF", bg: "#2196F3" },
  { id: "draft", label: "BORRADOR", color: "#FFFFFF", bg: "#FF9800" },
  { id: "confidential", label: "CONFIDENCIAL", color: "#FFFFFF", bg: "#F44336" },
  { id: "urgent", label: "URGENTE", color: "#FFFFFF", bg: "#9C27B0" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (stamp: Stamp) => void;
}

export function StampPicker({ open, onClose, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegí un sello</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {STAMPS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onPick(s);
                onClose();
              }}
              className="px-4 py-3 rounded font-bold text-lg border-2 transition-transform hover:scale-105"
              style={{
                backgroundColor: s.bg,
                color: s.color,
                borderColor: s.bg,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { STAMPS };
export type { Stamp };
