import type { Annotation } from "@/types/annotations";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";

export function annotationsToMarkdown(
  annotations: Annotation[],
  pdfPath: string
): string {
  const filename = pdfPath.split(/[\\/]/).pop() ?? pdfPath;
  const date = new Date().toLocaleString("es-PE");

  let md = `---\n`;
  md += `pdf: "${pdfPath}"\n`;
  md += `exported: ${date}\n`;
  md += `total_annotations: ${annotations.length}\n`;
  md += `tags: [pdf-anotaciones]\n`;
  md += `---\n\n`;
  md += `# Anotaciones de ${filename}\n\n`;

  if (annotations.length === 0) {
    md += `*Sin anotaciones.*\n`;
    return md;
  }

  const byCategory: Record<string, Annotation[]> = {};
  for (const a of annotations) {
    const cat = a.category ?? "Sin categoría";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(a);
  }

  for (const [cat, anns] of Object.entries(byCategory)) {
    md += `## ${cat}\n\n`;
    const byPage = [...anns].sort((a, b) => a.page - b.page);
    for (const a of byPage) {
      md += `### Página ${a.page + 1} — ${a.type}\n\n`;
      if (a.text) md += `> ${a.text}\n\n`;
      if (a.note) md += `**Nota:** ${a.note}\n\n`;
      md += `*Color: ${a.color} · ${a.createdAt.split("T")[0]}*\n\n`;
      md += `---\n\n`;
    }
  }

  return md;
}

export async function exportAnnotationsAsMarkdown(
  annotations: Annotation[],
  pdfPath: string
): Promise<boolean> {
  const md = annotationsToMarkdown(annotations, pdfPath);
  const filename = (pdfPath.split(/[\\/]/).pop() ?? "annotations").replace(
    /\.pdf$/i,
    ""
  );
  const target = await save({
    defaultPath: `${filename}-anotaciones.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (target) {
    await writeTextFile(target, md);
    return true;
  }
  return false;
}
