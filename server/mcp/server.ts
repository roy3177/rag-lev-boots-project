import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { RagSearchSchema, ragSearchTool } from "./tools/rag_search";
import { listKnowledgeSourcesTool } from "./tools/list_knowledge_sources";
import { ReadSourceSchema, readSourceTool } from "./tools/read_source";

const server = new McpServer({
  name: "lev-boots-rag-mcp",
  version: "1.0.0",
});

// 1) rag_search
server.tool("rag_search", RagSearchSchema, async (args) => {
  const result = await ragSearchTool(args);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

// 2) list_knowledge_sources (בלי פרמטרים)
server.tool("list_knowledge_sources", {}, async () => {
  const result = await listKnowledgeSourcesTool();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

// 3) read_source
server.tool("read_source", ReadSourceSchema, async (args) => {
  const result = await readSourceTool(args);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});