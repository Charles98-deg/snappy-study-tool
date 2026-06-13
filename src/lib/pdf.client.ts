import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PAGES = 100;
const MAX_EXTRACTED_CHARACTERS = 300_000;

export async function extractPdfText(file: File) {
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  let characterCount = 0;

  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PAGES); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!pageText) continue;
    const remaining = MAX_EXTRACTED_CHARACTERS - characterCount;
    if (remaining <= 0) break;
    pages.push(pageText.slice(0, remaining));
    characterCount += pageText.length;
  }

  await pdf.destroy();
  return pages.join("\n\n").trim();
}