import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";

// Define the input and output types for our search tool
interface SearchInFileInput {
  filePath: string;
  keyword: string;
}

interface SearchInFileOutput {
  matches: {
    line: number;
    content: string;
  }[];
  totalMatches: number;
}

interface LineMatch {
  content: string;
  line: number;
}

// Create the search tool
const searchInFileTool: Tool = {
  name: "search_in_file",
  description:
    "Search for a specified keyword within a file and return matching lines with line numbers",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "The path to the file to search in",
      },
      keyword: {
        type: "string",
        description: "The keyword to search for",
      },
    },
    required: ["filePath", "keyword"],
  },
  returns: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            line: {
              type: "number",
              description: "Line number where the match was found",
            },
            content: {
              type: "string",
              description: "Content of the line containing the match",
            },
          },
        },
      },
      totalMatches: {
        type: "number",
        description: "Total number of matches found",
      },
    },
  },
};

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
  name:"FileMCP",
  version:"1.0.0",
  capabilities:{
    tools:{}
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [searchTool],
  };
});

server.listen(process.env.PORT || 3000).then(() => {
  console.log("MCP Server is running...");
});
