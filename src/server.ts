import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs/promises";
import { z } from "zod";

// Define the input and output types for our search tool
interface SearchInFileInput {
  filePath: string;
  keyword: string;
}

interface LineMatch {
  content: string;
  line: number;
}

// Implement the search functionality
async function searchInFile(toolCall: { parameters: SearchInFileInput }) {
  const { filePath, keyword } = toolCall.parameters;

  try {
    // Read the file content
    const fileContent = await fs.readFile(filePath, "utf-8");
    const lines = fileContent.split("\n");

    // Search for matches
    const matches: LineMatch[] = lines
      .map(
        (content: string, index: number): LineMatch => ({
          content,
          line: index + 1,
        })
      )
      .filter((match: LineMatch): boolean => match.content.includes(keyword));

    return {
      matches,
      totalMatches: matches.length,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error searching file: ${error.message}`);
    }
    throw new Error("An unknown error occurred while searching the file");
  }
}

// Create and start the MCP server
const server = new McpServer({
  name: "FileMCP",
  version: "1.0.0",
  capabilities: {
    tools: {},
  },
});

// Register the tool with the MCP server. Use a stable id and a zod input schema.
server.registerTool(
  "search_in_file",
  {
    title: "Search In File",
    description:
      "Search for a specified keyword within a file and return matching lines with line numbers",
    // zod shape for validation (some MCP APIs expect a raw shape rather than a z.object)
    inputSchema: {
      filePath: z.string().describe("The path to the file to search in"),
      keyword: z.string().describe("The keyword to search for"),
    },
    // optional annotations can go here if SDK supports them
  },
  // handler receives the validated params
  async (params: { filePath: string; keyword: string }) => {
    const result = await searchInFile({ parameters: params });
    // Return a MCP response object with a content array so Inspector/clients can render it
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Keyword Search MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
