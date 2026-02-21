import { z } from "zod";
import path from "path";
import fs from "fs";

import { loadPdfText } from "../../utils/pdfLoader";
import { ARTICLE_SOURCES, ARTICLE_IDS, PDF_FILES } from "../../config/constants";

export const ReadSourceSchema = {
  sourceName: z.string().min(1),
  sourceType: z.enum(["pdf", "article"]).optional(),
};

function detectType(name: string): "pdf" | "article" {
  if (PDF_FILES.includes(name) || name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (ARTICLE_IDS.includes(name)) return "article";
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "article";
}
function resolvePdfPath(filename: string): string {
  const fromServer = path.join(process.cwd(), "knowledge_pdfs", filename);
  const fromRoot = path.join(process.cwd(), "server", "knowledge_pdfs", filename);

  if (fs.existsSync(fromServer)) return fromServer;
  if (fs.existsSync(fromRoot)) return fromRoot;

  throw new Error(`PDF not found: ${filename}`);
}

export async function readSourceTool(args: { sourceName: string; sourceType?: "pdf" | "article" }) {
  const type = args.sourceType ?? detectType(args.sourceName);

  if (type === "pdf") {
    const pdfPath = resolvePdfPath(args.sourceName);
    const text = await loadPdfText(pdfPath);
    return { type, sourceName: args.sourceName, text };
  }

  const src = ARTICLE_SOURCES.find((a) => a.id === args.sourceName);
  if (!src) throw new Error(`Unknown article id: ${args.sourceName}`);

  const resp = await fetch(src.url);
  if (!resp.ok) throw new Error(`Failed to fetch article: ${src.url}`);

  const text = await resp.text();
  return { type, sourceName: args.sourceName, text };
}