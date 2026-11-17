import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const HANDBOOK = [
  { topic: "Vacation", text: "Every full-time employee gets 25 paid vacation days per year. Up to 5 unused days can be carried over until March 31." },
  { topic: "Remote work", text: "Employees can work from home up to 3 days per week. Tuesdays are office days for every team." },
  { topic: "Passwords", text: "Passwords must be at least 12 characters long and two-step verification (MFA) is required on every account." },
  { topic: "Expenses", text: "Submit expenses within 30 days with a photo of the receipt. Meals while travelling are covered up to 40 dollars per day." },
  { topic: "Training", text: "Each employee has a learning budget of 1,000 dollars per year for courses, conferences and books." },
];

const IGNORE = new Set(["how", "many", "much", "what", "can", "the", "and", "for", "get", "day", "days", "per", "year", "you", "are", "does", "with"]);

// keyword search: score = number of question words found in the entry
function searchHandbook(question, maxResults) {
  const words = (question.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !IGNORE.has(w));
  return HANDBOOK
    .map((entry) => {
      const content = `${entry.topic} ${entry.text}`.toLowerCase();
      const score = words.filter((w) => content.includes(w)).length;
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

const server = new McpServer({ name: "brightwave-handbook", version: "1.0.0" });

server.tool(
  "list_topics",
  "List all topics covered by the Brightwave company handbook.",
  {},
  async () => ({
    content: [{ type: "text", text: HANDBOOK.map((e) => `- ${e.topic}`).join("\n") }],
  }),
);

server.tool(
  "search_handbook",
  "Search the Brightwave company handbook and return the most relevant entries.",
  {
    question: z.string().describe("The employee's question, e.g. 'How many vacation days do I get?'"),
    max_results: z.number().int().min(1).max(5).default(2).describe("How many entries to return"),
  },
  async ({ question, max_results }) => {
    const results = searchHandbook(question, max_results);
    const text = results.length
      ? results.map((r) => `[${r.topic}] ${r.text}`).join("\n")
      : "No matching entry in the handbook.";
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "vacation_days_left",
  "Calculate how many vacation days an employee has left this year.",
  { days_used: z.number().int().min(0).max(25).describe("Vacation days already used this year") },
  async ({ days_used }) => ({
    content: [{ type: "text", text: `You have ${25 - days_used} of 25 vacation days left this year.` }],
  }),
);

// stdio transport: the AI app runs this process and talks to it over stdin/stdout
await server.connect(new StdioServerTransport());
console.error("Brightwave Handbook MCP server is running (stdio).");
