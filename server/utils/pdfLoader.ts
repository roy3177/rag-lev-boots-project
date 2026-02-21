// server/utils/pdfLoader.ts
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

const pdfParse =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : pdfParseModule.default;

export async function loadPdfText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return (data.text ?? "").trim();
}