import { Message, ToolSet, jsonSchema } from "ai";
import { Tool as McpTool, CallToolResult } from "@mcplug/server";

const DEV = true;

const tryParse = (value: string) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
};

const BASE_URL = DEV ? "http://localhost:1111" : "https://tools.mcplug.ai";

type PlugServer = {
  id: string;
  servers: {
    id: string;
    version: string;
    tools: McpTool[];
  }[];
};

let messages: Message[] = [
  {
    role: "user",
    content: "What is the weather in Tokyo?",
    id: "1"
  }
];

type McplugOptions = {
  id: string;
  constants: Record<string, string>;
  sessionId: string;
  userId: string;
  fetch?: typeof fetch;
};

class McpPlug {
  tools: ToolSet;
  fetch = fetch;
  constructor(
    private readonly token: string,
    private readonly id: string,
    private readonly constants: Record<string, string>,
    private server: PlugServer,
    private sessionId: string,
    private userId: string,
    _fetch?: McplugOptions["fetch"]
  ) {
    this.tools = this.createToolSetHandler(this.server);
    if (_fetch) {
      this.fetch = _fetch;
    }
  }

  private createToolSetHandler = (plug: PlugServer): ToolSet => {
    return plug.servers.reduce((acc, { tools, id }) => {
      tools.forEach((tool) => {
        let accName = tool.name;
        const duplicates = Object.keys(acc).filter((key) => key.startsWith(tool.name));
        if (duplicates.length > 0) {
          accName = `${tool.name}_${duplicates.length + 1}`;
        }

        const { constantsParams, aiParameters } = Object.entries(tool.inputSchema.properties ?? {}).reduce(
          (acc, [key, value]) => {
            if (key.startsWith("_")) {
              Object.assign(acc.constantsParams, { [key.replace("_", "")]: value });
            } else {
              Object.assign(acc.aiParameters, { [key]: value });
            }
            return acc;
          },
          { constantsParams: {} as Record<string, object>, aiParameters: {} as Record<string, object> }
        );

        const hasConstantsSet = Object.keys(constantsParams)
          .filter((key) => tool.inputSchema.required?.some((required) => required.replace("_", "") === key))
          .every((key) => this.constants[key]);

        const toolConstants = Object.keys(constantsParams).reduce((acc, key) => {
          Object.assign(acc, { [key]: this.constants[key] });
          return acc;
        }, {} as Record<string, string>);

        if (hasConstantsSet) {
          Object.assign(acc, {
            [accName]: {
              description: tool.description,
              parameters: jsonSchema({
                type: "object",
                properties: aiParameters
              }),
              execute: this.executeTool(id, tool.name, toolConstants)
            }
          });
        }
      });

      return acc;
    }, {} as ToolSet);
  };

  private executeTool =
    (serverId: string, toolName: string, constants: Record<string, string>) => async (args: any) => {
      const body = JSON.stringify({
        name: toolName,
        arguments: { ...args, ...constants }
      });

      const response = await this.fetch(`${BASE_URL}/${this.id}/${serverId}/${toolName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          "mcp-session-id": this.sessionId,
          "mcp-user-id": this.userId
        },
        body
      });

      const data = (await response.json()) as { result?: CallToolResult };

      if (!data.result) {
        return null;
      }

      const results = data.result.content.map((part) => {
        if (part.type === "text") {
          return {
            ...part,
            text: tryParse(part.text)
          };
        }
        return part;
      });
      if (results.length === 0) {
        return null;
      }
      if (results.length === 1) {
        return results[0];
      }

      return results;
    };
}

export const mcplug = async (
  token: string,
  { id, constants, sessionId, userId, fetch: _fetch = fetch }: McplugOptions
): Promise<ToolSet> => {
  try {
    const response = await _fetch(`${BASE_URL}/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "mcp-session-id": sessionId,
        "mcp-user-id": userId
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with status ${response.status}: ${errorText}`);
    }

    const server = (await response.json()) as PlugServer;
    const plug = new McpPlug(token, id, constants, server, sessionId, userId, _fetch);
    return plug.tools;
  } catch (error) {
    console.error("Error in mcplug:", error);
    throw error;
  }
};
