import { toPng } from "html-to-image";

export async function exportViewAsPng(element: HTMLElement, fileName: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#03070d",
  });

  const anchor = document.createElement("a");
  anchor.download = fileName;
  anchor.href = dataUrl;
  anchor.click();
}
