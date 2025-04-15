import { ToolSet, jsonSchema } from "ai";
import { Tool as McpTool, CallToolResult } from "@mcplug/server";
import { Plug, PlugResponse } from "./types";
import { rpc } from "./rpc";
import { extractToolParams } from "./utils";

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
  constants: Record<string, string>;
  sessionId: string;
  userId: string;
  fetch?: typeof fetch;
};

class McpPlug {
  tools: ToolSet;
  fetch = fetch;
  rpc: ReturnType<typeof rpc>;
  constructor(
    private readonly token: string,
    private readonly id: string,
    private readonly constants: Record<string, string>,
    private plugResponse: PlugResponse,
    private sessionId: string,
    private userId: string,
    _fetch?: McplugOptions["fetch"]
  ) {
    this.tools = this.createToolSetHandler(this.plugResponse);
    if (_fetch) {
      this.fetch = _fetch;
    }

    this.rpc = rpc({
      id: this.id,
      token: this.token,
      userId: this.userId,
      sessionId: this.sessionId,
      fetch: this.fetch
    });
  }

  private createToolSetHandler = (plug: PlugResponse): ToolSet => {
    return plug.versions.reduce((acc, { tools, versionId }) => {
      tools.forEach((tool) => {
        let accName = tool.name;
        let duplicate = Object.keys(acc).find((key) => key == accName);
        let duplicateCount = 0;

        while (duplicate) {
          accName = `${tool.name}_${duplicateCount + 1}`;
          duplicate = Object.keys(acc).find((key) => key == accName);
          duplicateCount++;
        }

        const { constantsParams, aiParameters } = extractToolParams(tool);

        const hasConstantsSet = Object.keys(constantsParams)
          .filter((key) => tool.inputSchema.required?.some((required) => required.replace("_", "") === key))
          .every((key) => this.constants[key]);

        const toolConstants = Object.keys(constantsParams).reduce((acc, key) => {
          Object.assign(acc, { [`_${key}`]: this.constants[key] });
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
              execute: this.executeTool(versionId, tool.name, toolConstants)
            }
          });
        }
      });

      return acc;
    }, {} as ToolSet);
  };

  private executeTool =
    (versionId: string, toolName: string, constants?: Record<string, string>) => async (args: any) => {
      const data = await this.rpc(
        "tools/call",
        {
          name: toolName,
          arguments: { ...args, ...constants }
        },
        versionId
      );
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

export const mcplug = async ({
  token,
  id,
  constants,
  sessionId,
  userId,
  fetch: _fetch = fetch
}: McplugOptions): Promise<ToolSet> => {
  try {
    const response = await _fetch(`${BASE_URL}/v1/plug/${id}`, {
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
    const plugResponse = (await response.json()) as PlugResponse;
    const plug = new McpPlug(token, id, constants, plugResponse, sessionId, userId, _fetch);
    return plug.tools;
  } catch (error) {
    console.error("Error in mcplug:", error);
    throw error;
  }
};
