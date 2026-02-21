import { ARTICLE_IDS, PDF_FILES } from "../../config/constants";

export async function listKnowledgeSourcesTool() {
  return {
    pdfs: PDF_FILES.map((name) => ({ type: "pdf" as const, name })),
    articles: ARTICLE_IDS.map((id) => ({ type: "article" as const, id })),
  };
}