import { z } from "zod";
import { ask } from "../../services/ragService";

export const RagSearchSchema = {
  question: z.string().min(1),
};

export async function ragSearchTool(args: { question: string }) {
  const answer = await ask(args.question);
  return { answer };
}