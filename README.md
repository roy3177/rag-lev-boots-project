# Lev Boots – RAG + MCP System

A full Retrieval-Augmented Generation (RAG) system integrated with the Model Context Protocol (MCP).

This project combines:

- Google Gemini (Embeddings + LLM)
- PostgreSQL + pgvector
- Slack API ingestion (pagination + rate limiting)
- PDF ingestion
- External article ingestion
- MCP Server exposing AI tools
- MCP Inspector testing interface

---

# What This Project Does

This system allows you to:

1. Ingest knowledge from:
   - Markdown articles
   - Local PDFs
   - Slack channels (mock API)

2. Convert all data into:
   - 768-dimensional embeddings (Gemini)

3. Store them in:
   - PostgreSQL using pgvector

4. Ask natural language questions:
   - Retrieve most relevant chunks
   - Generate contextual answers using Gemini
   - Return cleaned, concise responses

5. Expose everything through:
   - MCP tools for AI agent integration

---

# Architecture Overview

## RAG Flow

```
User Question
      ↓
Embed Question (Gemini Embeddings)
      ↓
Vector Similarity Search (pgvector)
      ↓
Retrieve Top-K Chunks
      ↓
Build Context
      ↓
LLM Completion (Gemini Flash)
      ↓
Clean Final Answer
```

## MCP Flow

```
MCP Inspector / Claude
      ↓
rag_search tool
      ↓
ask()
      ↓
RAG Pipeline
      ↓
Answer Returned
```

---

# Project Structure

```
rag-lev-boots-project/
├─ public/
│ ├─ src/
│ ├─ index.html
│ ├─ vite.config.* (if exists)
│ └─ package.json
│
├─ server/
│ ├─ config/
│ │ ├─ config.cjs
│ │ ├─ constants.ts
│ │ └─ database.ts
│ │
│ ├─ controllers/
│ │ └─ (API controllers)
│ │
│ ├─ routes/
│ │ └─ ragRoutes.ts
│ │
│ ├─ services/
│ │ └─ ragService.ts
│ │
│ ├─ utils/
│ │ ├─ pdfLoader.ts
│ │ └─ checkPdf.ts
│ │
│ ├─ mcp/
│ │ ├─ server.ts
│ │ └─ tools/
│ │ ├─ rag_search.ts
│ │ ├─ list_knowledge_sources.ts
│ │ └─ read_source.ts
│ │
│ ├─ knowledge_pdfs/
│ │ └─ *.pdf
│ │
│ ├─ migrations/
│ ├─ models/
│ ├─ server.ts
│ ├─ package.json
│ ├─ tsconfig.json
│ ├─ .env
│ ├─ .sequelizerc
│ ├─ eslint.config.js
│ └─ prettierc / prettier config (if exists)
│
├─ package.json
├─ package-lock.json
├─ README.md
└─ tsconfig.json
```

---

# Setup

## Install Dependencies

From project root:

```bash
npm install
```

If needed:

```bash
npm install concurrently --save-dev
```

---

## Environment Variables

Create a `.env` file inside the `/server` directory:

```env
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=your_postgres_connection_string
```

You can obtain a free Gemini API key here:

- https://aistudio.google.com/app/apikey
- https://ai.google.dev/gemini-api/docs/quickstart#javascript

---

# Database Requirements

- PostgreSQL
- pgvector extension enabled
- `knowledge_base` table created via migrations

### Embedding Configuration

You must choose ONE embedding column and stick with it:

- `embeddings_768`
- `embeddings_1536`

This project uses:

- Model: `gemini-embedding-001`
- Dimension: `768`
- Column: `embeddings_768`

The embedding dimension MUST match the DB column.

---

# Data Ingestion

You must implement:

## `loadAllData()`

Responsibilities:

- Fetch all sources
- Chunk content into ~400-word pieces
- Embed each chunk
- Store chunks + embeddings into `knowledge_base`

Sources include:

- 5 external Markdown articles
- Local PDFs (`server/knowledge_pdfs`)
- Slack channels:
  - lab-notes
  - engineering
  - offtopic

Slack ingestion supports:
- Pagination
- Rate limiting (429 retry handling)
- Duplicate prevention

---

# Question Answering

## `ask(userQuestion)`

Responsibilities:

1. Embed the question (same embedding model)
2. Run similarity search using pgvector:

```sql
ORDER BY embeddings_768 <-> :qVec
LIMIT 8
```

3. Construct context from retrieved chunks
4. Generate answer using Gemini Flash
5. Enforce context-only answering
6. Return cleaned response

The model is instructed to:
- Use ONLY retrieved context
- Avoid hallucinations
- Return concise answers

---

# Running the RAG UI

From project root:

```bash
npm run dev
```

This runs frontend + backend concurrently.

Open:

```
http://localhost:5173/
```

---

# Running MCP Inspector

Navigate to:

```bash
cd server
```

Then run:

```bash
npx @modelcontextprotocol/inspector \
  -e GEMINI_API_KEY="PASTE_YOUR_KEY" \
  -e DATABASE_URL="PASTE_YOUR_DB_URL" \
  -- npx tsx mcp/server.ts
```

Steps:

1. Open Inspector UI
2. Click **Tools**
3. Select `rag_search`
4. Provide:

```json
{
  "question": "What operational challenges were mentioned?"
}
```

---

# Troubleshooting

### No Results Returned
- Check embedding dimension matches DB column
- Ensure `loadAllData()` ran successfully
- Confirm embeddings are not NULL

### Slack Ingestion Issues
- Verify pagination loop
- Confirm rate-limit retry logic

### MCP Tool Not Working
- Ensure environment variables are passed correctly
- Confirm correct path to `mcp/server.ts`

---

# What This Project Demonstrates

- End-to-end RAG architecture
- Vector database integration
- Embedding lifecycle management
- Prompt engineering
- API ingestion with resilience
- MCP tool exposure
- Clean modular backend design

---

# Final Notes

This repository represents a production-style RAG system integrated with MCP tools for AI agent interoperability.

Built with scalability, clarity, and real-world design considerations in mind.