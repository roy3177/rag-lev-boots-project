import sequelize from '../config/database';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { loadPdfText } from '../utils/pdfLoader';

// ----------------------
// Config
// ----------------------
const EMBED_DIM = 768 as const;
const EMBED_COL = 'embeddings_768' as const;

// Gemini SDK reads GEMINI_API_KEY from env if you don't pass it explicitly.
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ----------------------
// Utils
// ----------------------
function chunkByWords(text: string, wordsPerChunk = 400): string[] {
  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

function toPgVectorLiteral(vec: number[]) {
  // pgvector literal looks like: '[0.1,0.2,...]'
  return `[${vec.join(',')}]`;
}

async function embedText(text: string): Promise<number[]> {
  // Use Gemini embeddings API. 
  // Note: model names can vary; "text-embedding-004" commonly returns 768-dim embeddings.
  const res = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });

  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBED_DIM) {
    throw new Error(
      `Embedding failed or unexpected dim. Got ${values?.length ?? 0}, expected ${EMBED_DIM}`
    );
  }
  return values;
}

async function upsertChunk(params: {
  source: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
  embedding: number[];
}) 

{
  const { source, sourceId, chunkIndex, chunkContent, embedding } = params;

  // Avoid re-inserting if exists (saves tokens/time)
  const [existing] = await sequelize.query(
    `
    SELECT id
    FROM knowledge_base
    WHERE source = :source AND source_id = :sourceId AND chunk_index = :chunkIndex
    LIMIT 1
    `,
    { replacements: { source, sourceId, chunkIndex } }
  );

  // @ts-ignore - sequelize returns array-ish
  if (existing?.length && existing[0]?.id) return;

  // Insert with pgvector cast (assuming migrations created pgvector columns)
  await sequelize.query(
    `
    INSERT INTO knowledge_base (source, source_id, chunk_index, chunk_content, ${EMBED_COL})
    VALUES (:source, :sourceId, :chunkIndex, :chunkContent, :embedding::vector)
    `,
    {
      replacements: {
        source,
        sourceId,
        chunkIndex,
        chunkContent,
        embedding: toPgVectorLiteral(embedding),
      },
    }
  );
  console.log(
  `Inserted → ${source} | ${sourceId} | chunk ${chunkIndex}`
);
}

// ----------------------
// Slack Utils
// ----------------------
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithRetry(url: string, retries = 8) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url);

    if (resp.status === 429) {
      console.log("⏳ Rate limited — waiting...");
      await sleep(500);
      continue;
    }

    if (!resp.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }

    return resp.json();
  }

  throw new Error("Too many retries (Slack API)");
}


// ----------------------
// 1) loadAllData 
// ----------------------
export const loadAllData = async () => {
const articles = [
  {
    id: 'military-deployment-report',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-1_military-deployment-report.md',
  },
  {
    id: 'urban-commuting',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-2_urban-commuting.md',
  },
  {
    id: 'hover-polo',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-3_hover-polo.md',
  },
  {
    id: 'warehousing',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-4_warehousing.md',
  },
  {
    id: 'consumer-safety',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-5_consumer-safety.md',
  },
];


  for (const article of articles) {
    const resp = await fetch(article.url);
    if (!resp.ok) {
      console.error(`Failed to fetch ${article.id}`);
      continue;
    }

    const text = await resp.text();
    const chunks = chunkByWords(text, 400);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);

      await upsertChunk({
        source: 'article',
        sourceId: article.id,
        chunkIndex: i,
        chunkContent: chunks[i],
        embedding,
      });
    }
  }

    // ----------------------
  // PDFs ingestion
  // ----------------------
  const pdfDir = path.join(process.cwd(), 'server', 'knowledge_pdfs');
  const pdfFiles = fs
    .readdirSync(pdfDir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'));

  for (const file of pdfFiles) {
    const fullPath = path.join(pdfDir, file);

    const text = await loadPdfText(fullPath);
    const chunks = chunkByWords(text, 400);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);

      await upsertChunk({
        source: 'pdf',
        sourceId: file, // filename as ID
        chunkIndex: i,
        chunkContent: chunks[i],
        embedding,
      });
    }
  }

  // ----------------------
// Slack ingestion
// ----------------------
const SLACK_BASE =
  "https://lev-boots-slack-api.jona-581.workers.dev";

const channels = ["lab-notes", "engineering", "offtopic"];

for (const channel of channels) {
  console.log(` Slack ingest start: ${channel}`);

  let page = 1;

  while (true) {
    const url = `${SLACK_BASE}/?channel=${channel}&page=${page}`;

    const data: any = await fetchWithRetry(url);

    const messages = data.messages ?? [];

    if (!messages.length) {
      console.log(` No more pages for ${channel}`);
      break;
    }

    const joined = messages
      .map(
        (m: any) =>
          `[${m.timestamp ?? ""}] ${m.user ?? "user"}: ${m.text ?? ""}`
      )
      .join("\n");

    const chunks = chunkByWords(joined, 400);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);

      await upsertChunk({
        source: "slack",
        sourceId: `${channel}-page-${page}`,
        chunkIndex: i,
        chunkContent: chunks[i],
        embedding,
      });
    }

    console.log(
      ` Slack page done → ${channel} page=${page} chunks=${chunks.length}`
    );

    page++;
  }
}


};

// ----------------------
// 2) ask
// ----------------------
export const ask = async (userQuestion: string): Promise<string> => {
  const qEmbedding = await embedText(userQuestion);
  const qVec = toPgVectorLiteral(qEmbedding);

  // Retrieve top-k most similar chunks from DB using pgvector distance
  const [rows] = await sequelize.query(
    `
    SELECT source, source_id, chunk_index, chunk_content
    FROM knowledge_base
    WHERE ${EMBED_COL} IS NOT NULL
    ORDER BY ${EMBED_COL} <-> :qVec::vector
    LIMIT 8
    `,
    { replacements: { qVec } }
  );

  // @ts-ignore
  const snippets: string[] = (rows || []).map((r: any) => r.chunk_content);

  const context = snippets
    .map((s, i) => `[#${i + 1}] ${s}`)
    .join('\n\n');

  const prompt = `
You are a consulting analyst assistant.

Answer the user's question using ONLY the context below.

Rules:
- Cite sources using [#number] notation.
- If multiple sources support the answer, cite all relevant ones.
- If the answer is not in the context, say:
  "I don't have enough information in the provided sources."

Context:
${context}

Question:
${userQuestion}
`.trim();

  const completion = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    // If supported, you can disable thinking to save tokens.
  });

  const text = completion.text || '';

  // Remove citations [#1]
  let cleaned = text.replace(/\[#\d+\]/g, '');

  // Remove bold/italic markdown (**text**, *text*)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');

  // Remove extra markdown headers ###
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');

  return cleaned.trim();

};
