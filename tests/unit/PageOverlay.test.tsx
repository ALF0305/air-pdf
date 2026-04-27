import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PageOverlay, resolveFormat } from "@/components/viewer/PageOverlay";
import { useUiStore } from "@/stores/uiStore";

describe("resolveFormat", () => {
  it("reemplaza {n} y {total}", () => {
    expect(resolveFormat("{n} / {total}", 3, 10)).toBe("3 / 10");
  });

  it("acepta tokens en mayusculas", () => {
    expect(resolveFormat("Pagina {N} de {TOTAL}", 5, 7)).toBe("Pagina 5 de 7");
  });

  it("preserva texto sin tokens", () => {
    expect(resolveFormat("solo texto", 1, 1)).toBe("solo texto");
  });
});

describe("PageOverlay", () => {
  beforeEach(() => {
    useUiStore.setState({
      watermarkPreview: null,
      pageNumberPreview: null,
    });
    cleanup();
  });

  it("no renderiza nada cuando ambos previews son null", () => {
    const { container } = render(
      <PageOverlay pageIndex={0} totalPages={5} scale={1} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el watermark cuando watermarkPreview esta seteado", () => {
    useUiStore.setState({
      watermarkPreview: { text: "BORRADOR", fontSize: 60, opacity: 0.5 },
    });
    render(<PageOverlay pageIndex={0} totalPages={5} scale={1} />);
    const wm = screen.getByTestId("watermark-preview");
    expect(wm.textContent).toBe("BORRADOR");
    // El font-size es fontSize * scale en px
    expect(wm.style.fontSize).toBe("60px");
    expect(wm.style.color).toBe("rgb(255, 0, 0)");
  });

  it("escala el watermark con el zoom", () => {
    useUiStore.setState({
      watermarkPreview: { text: "X", fontSize: 60, opacity: 1 },
    });
    render(<PageOverlay pageIndex={0} totalPages={5} scale={2} />);
    const wm = screen.getByTestId("watermark-preview");
    // 60pt * scale 2 = 120px
    expect(wm.style.fontSize).toBe("120px");
  });

  it("renderiza numero de pagina con formato resuelto", () => {
    useUiStore.setState({
      pageNumberPreview: { format: "{n} de {total}", fontSize: 11 },
    });
    render(<PageOverlay pageIndex={2} totalPages={10} scale={1} />);
    const pn = screen.getByTestId("page-number-preview");
    // pageIndex 2 es 0-based, mostrar como 3
    expect(pn.textContent).toBe("3 de 10");
  });

  it("renderiza ambos previews simultaneamente", () => {
    useUiStore.setState({
      watermarkPreview: { text: "WM", fontSize: 40, opacity: 0.3 },
      pageNumberPreview: { format: "{n}", fontSize: 12 },
    });
    render(<PageOverlay pageIndex={0} totalPages={1} scale={1} />);
    expect(screen.getByTestId("watermark-preview")).toBeTruthy();
    expect(screen.getByTestId("page-number-preview")).toBeTruthy();
  });

  it("el wrapper tiene pointer-events: none para no interferir", () => {
    useUiStore.setState({
      watermarkPreview: { text: "X", fontSize: 12, opacity: 1 },
    });
    render(<PageOverlay pageIndex={0} totalPages={1} scale={1} />);
    const overlay = screen.getByTestId("page-overlay");
    expect(overlay.style.pointerEvents).toBe("none");
  });
});
