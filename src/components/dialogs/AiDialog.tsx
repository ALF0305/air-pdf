import { useEffect, useState } from "react";
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
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { usePdfStore } from "@/stores/pdfStore";
import { askClaude, extractTextToFile, readLocalApiKey } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

const KEY_STORAGE = "airpdf-anthropic-key";

const PRESETS: { label: string; prompt: (t: string) => string }[] = [
  {
    label: "Resumen breve",
    prompt: (t) =>
      `Resume este documento en máximo 5 bullets, en español, priorizando datos clínicos accionables.\n\n${t}`,
  },
  {
    label: "Resumen para paciente",
    prompt: (t) =>
      `Explica este documento en términos simples para un paciente sin formación médica, en español, manteniendo precisión clínica.\n\n${t}`,
  },
  {
    label: "Extraer conclusiones",
    prompt: (t) =>
      `Extrae las conclusiones y recomendaciones principales de este paper/documento en español, citando página si es posible.\n\n${t}`,
  },
  {
    label: "Metodología y sesgos",
    prompt: (t) =>
      `Analiza críticamente la metodología de este estudio en español: diseño, tamaño muestral, sesgos potenciales, validez externa.\n\n${t}`,
  },
];

export function AiDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(KEY_STORAGE) ?? ""
  );
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  // On mount, if no localStorage key, try reading from ~/.claude/ai-sync/.secrets.toml
  useEffect(() => {
    if (apiKey) return;
    readLocalApiKey()
      .then((k) => {
        if (k) setApiKey(k);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tab) return null;

  const loadTextAndAsk = async (prompt: (t: string) => string) => {
    if (!apiKey) {
      alert("Falta tu API key de Anthropic. Obtenla en console.anthropic.com.");
      return;
    }
    localStorage.setItem(KEY_STORAGE, apiKey);
    setBusy(true);
    setResponse("");
    try {
      // Extract text to a temp file then read it
      const tmp = `${tab.path}.ai.tmp.txt`;
      await extractTextToFile(tab.path, tmp);
      const text = await readTextFile(tmp);
      const truncated =
        text.length > 80000 ? text.slice(0, 80000) + "\n\n[…truncado]" : text;
      const answer = await askClaude(apiKey, prompt(truncated));
      setResponse(answer);
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-ia.md"),
      filters: [{ name: "Markdown", extensions: ["md", "txt"] }],
    });
    if (!out) return;
    try {
      await writeTextFile(out, response);
      alert(`Guardado en:\n${out}`);
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preguntar a Claude sobre este PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <Label htmlFor="ai-key">Anthropic API Key (se guarda local)</Label>
            <Input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
            <p className="text-xs text-muted-foreground">
              Obtenla en{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                console.anthropic.com
              </a>
              . Se almacena solo en este navegador local.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Atajos</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => loadTextAndAsk(p.prompt)}
                  disabled={busy}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ai-q">Pregunta personalizada</Label>
            <textarea
              id="ai-q"
              rows={3}
              className="w-full border rounded p-2 text-sm bg-background"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: ¿Cuáles son los criterios de inclusión del estudio?"
            />
            <Button
              size="sm"
              onClick={() =>
                loadTextAndAsk(
                  (t) =>
                    `${question}\n\n--- Documento ---\n${t}\n\nResponde en español.`
                )
              }
              disabled={busy || !question}
            >
              {busy ? "Consultando..." : "Enviar"}
            </Button>
          </div>

          {response && (
            <div className="border rounded max-h-72 overflow-auto p-3 text-sm whitespace-pre-wrap">
              {response}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          {response && (
            <Button variant="outline" onClick={handleSave}>
              Guardar respuesta...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
