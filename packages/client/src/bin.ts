#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  InitializeResult,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListToolsResult,
  ReadResourceRequestSchema,
  GetPromptRequest,
  UnsubscribeRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "./rpc";
import { PlugResponse } from "./types";
import { extractToolParams } from "./utils";
import { Resource, Prompt } from "@mcplug/server";

class RemoteMCPlugClient {
  public readonly server: Server;
  rpc: ReturnType<typeof rpc>;
  toolList: ListToolsResult["tools"];
  toolVersionId = new Map<string, string>();
  toolConstants = new Map<string, Record<string, string>>();
  toolRealName = new Map<string, string>();
  promptVersionId = new Map<string, string>();
  promptRealName = new Map<string, string>();
  resourceVersionId = new Map<string, string>();
  resourceRealName = new Map<string, string>();
  prompts: Prompt[];
  resources: Resource[];
  constructor(
    private readonly id: string,
    private readonly env: Record<string, string>,
    private readonly plug: PlugResponse,
    private readonly sessionId: string
  ) {
    this.server = new Server(
      {
        name: "MCPlug Client",
        version: "1.0.0"
      },
      {
        capabilities: plug.initializeResult.capabilities as any
      }
    );

    this.rpc = rpc({
      id: this.id,
      token: this.env.MC_PLUG_TOKEN,
      userId: this.env.MC_PLUG_USER_ID,
      sessionId: this.sessionId
    });

    this.toolList = this.plug.versions.reduce((acc, version) => {
      version.tools.forEach((tool) => {
        let accName = tool.name;
        let duplicate = Object.keys(acc).find((key) => key == accName);
        let duplicateCount = 0;

        while (duplicate) {
          accName = `${tool.name}_${duplicateCount + 1}`;
          duplicate = Object.keys(acc).find((key) => key == accName);
          duplicateCount++;
        }
        this.toolVersionId.set(accName, version.versionId);
        this.toolRealName.set(accName, tool.name);
        const { constantsParams, aiParameters } = extractToolParams(tool);

        const hasConstantsSet = Object.keys(constantsParams)
          .filter((key) => tool.inputSchema.required?.some((required) => required.replace("_", "") === key))
          .every((key) => this.env[key]);
        const toolConstants = Object.keys(constantsParams).reduce((acc, key) => {
          Object.assign(acc, { [key]: this.env[key] });
          return acc;
        }, {} as Record<string, string>);

        if (hasConstantsSet) {
          this.toolConstants.set(accName, toolConstants);
          acc.push({
            inputSchema: {
              type: "object",
              properties: aiParameters
            },
            name: tool.name,
            description: tool.description
          });
        }
      });

      return acc;
    }, [] as ListToolsResult["tools"]);

    this.prompts = this.plug.versions.reduce((acc, version) => {
      version.prompts?.forEach((prompt) => {
        let accName = prompt.name;
        let duplicate = Object.keys(acc).find((key) => key == accName);
        let duplicateCount = 0;

        while (duplicate) {
          accName = `${prompt.name}_${duplicateCount + 1}`;
          duplicate = Object.keys(acc).find((key) => key == accName);
          duplicateCount++;
        }
        this.promptVersionId.set(accName, version.versionId);
        this.promptRealName.set(accName, prompt.name);
        acc.push({
          name: prompt.name,
          description: prompt.description || "",
          arguments: prompt.arguments!
        });
      });
      return acc;
    }, [] as Prompt[]);

    this.resources = this.plug.versions.reduce((acc, version) => {
      version.resources?.forEach((resource) => {
        let accName = resource.name;
        let duplicate = Object.keys(acc).find((key) => key == accName);
        let duplicateCount = 0;

        while (duplicate) {
          accName = `${resource.name}_${duplicateCount + 1}`;
          duplicate = Object.keys(acc).find((key) => key == accName);
          duplicateCount++;
        }

        this.resourceVersionId.set(resource.uri, version.versionId);
        this.resourceRealName.set(accName, resource.name);
        acc.push({
          name: resource.name,
          description: resource.description || "",
          uri: resource.uri,
          mimeType: resource.mimeType || ""
        });
      });

      return acc;
    }, [] as Resource[]);
    this.setupHandlers();
  }

  static async start(id: string, env: Record<string, string>) {
    const sessionId = crypto.randomUUID();
    const response = await fetch(`https://proxy.mcplug.com/v1/plug/${id}`, {
      headers: {
        Authorization: `Bearer ${env.MC_PLUG_TOKEN}`,
        "mcp-session-id": sessionId
      }
    });

    const plug = (await response.json()) as PlugResponse;
    const client = new RemoteMCPlugClient(id, env, plug, sessionId);

    const transport = new StdioServerTransport();
    await client.server.connect(transport);
    return client;
  }

  private onError = (method: string, error: any) => {
    this.server.sendLoggingMessage({
      level: "error",
      data: `${method}: ${error.message}`
    });
  };

  private async setupHandlers() {
    // PROMPTS
    this.server.setRequestHandler(ListPromptsRequestSchema, () => {
      return {
        prompts: this.prompts
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await this.rpc(
        request.method,
        {
          name: this.promptRealName.get(request.params.name)!,
          arguments: request.params.arguments || {}
        },
        this.promptVersionId.get(request.params.name)!
      );
    });

    // RESOURCES
    this.server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      return {
        resources: this.resources
      };
    });
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await this.rpc(request.method, request.params, this.resourceVersionId.get(request.params.uri)!);
    });

    // TOOLS
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      return {
        tools: this.toolList
      } as ListToolsResult;
    });
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;
      const versionId = this.toolVersionId.get(name);
      const constants = this.toolConstants.get(name);
      const realName = this.toolRealName.get(name);
      const result = await this.rpc(
        request.method,
        {
          name: realName!,
          arguments: {
            ...request.params.arguments,
            ...constants
          }
        },
        versionId
      );
      return result;
    });
  }
}

void RemoteMCPlugClient.start(process.argv[2], process.env as Record<string, string>);

export default RemoteMCPlugClient;
