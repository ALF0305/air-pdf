import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { encryptPdf, decryptPdf, type PdfPermissions } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "protect" | "unlock";

export function PasswordDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [mode, setMode] = useState<Mode>("protect");
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [permissions, setPermissions] = useState<PdfPermissions>({
    allowPrint: true,
    allowExtract: false,
    allowModify: false,
    allowAnnotateAndForm: false,
    allowFormFilling: false,
    allowAssemble: false,
    allowAccessibility: true,
  });
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const reset = () => {
    setUserPassword("");
    setOwnerPassword("");
    setUnlockPassword("");
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleProtect = async () => {
    if (!userPassword) {
      alert("La contraseña de apertura es obligatoria.");
      return;
    }
    if (ownerPassword && ownerPassword === userPassword) {
      const ok = confirm(
        "Las contraseñas de apertura y de propietario son iguales. " +
          "Es recomendable que sean distintas para mantener control. " +
          "¿Continuar de todos modos?"
      );
      if (!ok) return;
    }
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-protegido.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      // Si owner queda vacio, qpdf lo trata como user. Para mas seguridad
      // recomendamos pero no forzamos uno distinto.
      const owner = ownerPassword || userPassword;
      await encryptPdf(tab.path, out, userPassword, owner, permissions);
      alert(`PDF protegido guardado en:\n${out}`);
      handleClose();
    } catch (e) {
      alert(`Error al cifrar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassword) {
      alert("Ingresa la contraseña actual del PDF.");
      return;
    }
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-sin-password.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      await decryptPdf(tab.path, out, unlockPassword);
      alert(`PDF desprotegido guardado en:\n${out}`);
      handleClose();
    } catch (e) {
      alert(
        `Error al descifrar: ${e}\n\n` +
          "Verifica que la contraseña sea correcta. " +
          "Si solo tienes la contraseña de usuario, puedes no tener permisos suficientes para quitar el cifrado."
      );
    } finally {
      setBusy(false);
    }
  };

  const togglePerm = (key: keyof PdfPermissions) => {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Seguridad del PDF</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={mode === "protect" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("protect")}
          >
            Proteger con contraseña
          </Button>
          <Button
            variant={mode === "unlock" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("unlock")}
          >
            Quitar contraseña
          </Button>
        </div>

        {mode === "protect" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cifrado AES-256. Se crea una copia nueva, el PDF original no se
              modifica.
            </p>

            <div className="space-y-1">
              <Label htmlFor="pw-user">Contraseña de apertura *</Label>
              <Input
                id="pw-user"
                type={showPasswords ? "text" : "password"}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Requerida para abrir el PDF"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pw-owner">
                Contraseña de propietario (opcional)
              </Label>
              <Input
                id="pw-owner"
                type={showPasswords ? "text" : "password"}
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Si la dejas vacía, se usa la de apertura"
              />
              <p className="text-xs text-muted-foreground">
                Solo con esta contraseña se pueden cambiar permisos o quitar el
                cifrado.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Mostrar contraseñas
            </label>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">
                Permisos para quien abra con la contraseña de apertura:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <PermCheck
                  label="Imprimir"
                  checked={!!permissions.allowPrint}
                  onChange={() => togglePerm("allowPrint")}
                />
                <PermCheck
                  label="Copiar texto"
                  checked={!!permissions.allowExtract}
                  onChange={() => togglePerm("allowExtract")}
                />
                <PermCheck
                  label="Modificar contenido"
                  checked={!!permissions.allowModify}
                  onChange={() => togglePerm("allowModify")}
                />
                <PermCheck
                  label="Anotar y formularios"
                  checked={!!permissions.allowAnnotateAndForm}
                  onChange={() => togglePerm("allowAnnotateAndForm")}
                />
                <PermCheck
                  label="Llenar formularios"
                  checked={!!permissions.allowFormFilling}
                  onChange={() => togglePerm("allowFormFilling")}
                />
                <PermCheck
                  label="Reorganizar páginas"
                  checked={!!permissions.allowAssemble}
                  onChange={() => togglePerm("allowAssemble")}
                />
                <PermCheck
                  label="Accesibilidad (lectores de pantalla)"
                  checked={!!permissions.allowAccessibility}
                  onChange={() => togglePerm("allowAccessibility")}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "unlock" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Quita la contraseña del PDF actual y guarda una copia sin cifrado.
              Se requiere conocer la contraseña.
            </p>

            <div className="space-y-1">
              <Label htmlFor="pw-unlock">Contraseña actual del PDF</Label>
              <Input
                id="pw-unlock"
                type={showPasswords ? "text" : "password"}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Mostrar contraseña
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancelar
          </Button>
          {mode === "protect" ? (
            <Button onClick={handleProtect} disabled={busy || !userPassword}>
              {busy ? "Cifrando..." : "Proteger..."}
            </Button>
          ) : (
            <Button onClick={handleUnlock} disabled={busy || !unlockPassword}>
              {busy ? "Descifrando..." : "Quitar contraseña..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
