// server/utils/pdfLoader.ts
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); // CommonJS module loaded safely in ESM

export async function loadPdfText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return (data.text ?? "").trim();
}
