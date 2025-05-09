import { ToolSet, jsonSchema } from "ai";
import { PlugDefinition, PlugResponse } from "../types";
import { rpc } from "../rpc";
import { extractToolParams } from "../utils";
export * from "../utils";
export * from "./types.ai";

const DEV = false;

const tryParse = (value: string) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
};

const BASE_URL = DEV ? "http://localhost:1111" : "https://proxy.mcplug.ai";

export type McplugOptions = {
  token: string;
  id: string;
  constants?: Record<string, string>;
  sessionId?: string;
  fetch?: typeof fetch;
};

class McpPlug<TOOLSET extends ToolSet> {
  tools: TOOLSET;
  fetch = fetch;
  rpc: ReturnType<typeof rpc>;
  constructor(
    private readonly token: string,
    private readonly id: string,
    private readonly constants: Record<string, string>,
    private plugDefinition: PlugDefinition,
    private sessionId: string | undefined,
    _fetch?: McplugOptions["fetch"]
  ) {
    this.tools = this.createToolSetHandler(this.plugDefinition);
    if (_fetch) {
      this.fetch = _fetch;
    }

    this.rpc = rpc({
      id: this.id,
      token: this.token,
      sessionId: this.sessionId,
      fetch: this.fetch
    });
  }

  private createToolSetHandler = (plug: PlugDefinition): TOOLSET => {
    const { availableTools, notAvailableTools } = plug;

    const allTools = availableTools.concat(
      notAvailableTools
        .filter((tool) => tool.if.every((ifCondition) => this.constants[ifCondition]))
        .map((tool) => ({ name: tool.name } as (typeof availableTools)[number]))
    );

    return allTools.reduce((acc, tool) => {
      const definition = this.plugDefinition.toolDefinitions[tool.name];

      const toolConstants = definition.constantsProperties.reduce((acc, key) => {
        Object.assign(acc, { [`_${key}`]: this.constants[key] });
        return acc;
      }, {} as Record<string, string>);

      Object.assign(acc, {
        [tool.name]: {
          description: tool.description,
          parameters: jsonSchema(tool.inputSchema),
          execute: this.executeTool(tool.name, toolConstants)
        }
      });

      return acc;
    }, {} as TOOLSET);
  };

  private executeTool = (toolName: string, constants?: Record<string, string>) => async (args: any) => {
    const data = await this.rpc("tools/call", {
      name: toolName,
      arguments: { ...args, ...constants }
    });
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
      if (results[0].type === "text") {
        return results[0].text;
      }
      return results[0];
    }

    return results;
  };
}

export const mcplug = async <TOOLSET extends ToolSet = ToolSet>({
  token,
  id,
  constants,
  sessionId,
  fetch: _fetch = fetch
}: McplugOptions): Promise<TOOLSET> => {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "x-mcplug-client": "ai",
      "x-mcplug-id": id
    };

    if (sessionId) {
      Object.assign(headers, {
        "mcp-session-id": sessionId
      });
    }
    const response = await _fetch(`${BASE_URL}`, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with status ${response.status}: ${errorText}`);
    }
    const plugDefinition = (await response.json()) as PlugDefinition;

    const plug = new McpPlug(token, id, constants || {}, plugDefinition, sessionId, _fetch);
    return plug.tools as TOOLSET;
  } catch (error) {
    console.error("Error in mcplug:", error);
    throw error;
  }
};
