import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function test() {
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"));
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  
  await client.connect(transport);
  
  const tools = await client.listTools();
  console.log("Tools:", JSON.stringify(tools, null, 2));
  
  const result = await client.callTool({
    name: "create_news_item",
    arguments: {
      feedCode: "technology",
      titleHe: "בדיקת MCP",
      summaryHe: "בדיקה ליצירת רשומה דרך סוכן MCP.",
      sourceName: "MCP Test Modern",
      sourceUrl: "https://example.com/mcp-test-modern-20260813",
      displayWeekStart: "2026-08-09"
    }
  });
  console.log("Tool Result:", JSON.stringify(result, null, 2));
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
