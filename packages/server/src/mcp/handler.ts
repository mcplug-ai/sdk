import { CTX, ENV, MaybePromise, MCPServer } from "../types";
import { defineTools, Tool, ToolError } from "../tools";
import { definePrompts, Prompt } from "../prompts";
import { defineResources, Resource } from "../resources";
import { MCPError, mcpError } from "./errors";
import {
  ClientRequest,
  InitializeResult,
  ListPromptsResult,
  ListResourcesResult,
  ReadResourceResult,
  CompleteResult,
  EmptyResult,
  CallToolResult,
  ListToolsResult,
  GetPromptResult,
  InitializeRequest,
  GetPromptRequest,
  ListPromptsRequest,
  SetLevelRequest,
  ListResourcesRequest,
  ReadResourceRequest,
  CallToolRequest,
  CompleteRequest,
  PingRequest,
  ListToolsRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  RequestId,
  PaginatedResult,
  Tool as SpecTool,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  InitializedNotification
} from "./spec";

export interface ListToolsOutputResult extends PaginatedResult {
  tools: (SpecTool & {
    outputSchema: SpecTool["inputSchema"];
  })[];
}

type MCPHandlerInterface = {
  initialize: (payload: InitializeRequest["params"]) => MaybePromise<InitializeResult | MCPError>;
  notifications: {
    initialized: (payload: InitializedNotification["params"]) => MaybePromise<EmptyResult | MCPError>;
  };
  prompts: {
    get: (payload: GetPromptRequest["params"]) => MaybePromise<GetPromptResult | MCPError>;
    list: (payload: ListPromptsRequest["params"]) => MaybePromise<ListPromptsResult | MCPError>;
  };
  completion?: {
    complete?: (payload: CompleteRequest["params"]) => MaybePromise<CompleteResult | MCPError>;
  };
  logging?: {
    setLevel?: (payload: SetLevelRequest["params"]) => MaybePromise<EmptyResult | MCPError>;
  };
  resources: {
    list: (payload: ListResourcesRequest["params"]) => MaybePromise<ListResourcesResult | MCPError>;
    read: (payload: ReadResourceRequest["params"]) => MaybePromise<ReadResourceResult | MCPError>;
    subscribe?: (payload: SubscribeRequest["params"]) => MaybePromise<EmptyResult | MCPError>;
    unsubscribe?: (payload: UnsubscribeRequest["params"]) => MaybePromise<EmptyResult | MCPError>;
    templates: {
      list: (payload: ListResourceTemplatesRequest["params"]) => MaybePromise<ListResourceTemplatesResult | MCPError>;
    };
  };
  tools: {
    call: (payload: CallToolRequest["params"]) => MaybePromise<CallToolResult | MCPError>;
    list: (payload: ListToolsRequest["params"]) => MaybePromise<ListToolsResult | MCPError>;
    io: (payload: ListToolsRequest["params"]) => MaybePromise<ListToolsResult | MCPError>;
  };
  ping?: (payload: PingRequest) => MaybePromise<EmptyResult | MCPError>;
};

export type RPCRequest = ClientRequest & { id: RequestId };

export type Version<
  T extends Record<string, Tool<any, any>>,
  R extends Record<string, Resource<any>>,
  P extends Record<string, Prompt<any, any>>
> = {
  name?: string;
  tools: {
    [K in keyof T]: T[K] extends Tool<infer S, infer H> ? T[K] : never;
  };
  resources?: {
    [K in keyof R]: R[K] extends Resource<infer S> ? R[K] : never;
  };
  prompts?: {
    [K in keyof P]: P[K] extends Prompt<infer S, infer H> ? P[K] : never;
  };
};

export type Server = {
  secret: string;
  versions: Record<string, Version<any, any, any>>;
};

export const isBatch = (body: RPCRequest | RPCRequest[]): body is RPCRequest[] => {
  return Array.isArray(body);
};

export class MCPHandler {
  private server: MCPServer;
  private hasTools: boolean;
  private hasResources: boolean;
  private hasPrompts: boolean;

  constructor(server: MCPServer, private sessionId: string, private env: ENV, private ctx: CTX) {
    this.server = server;
    const { tools, resources, prompts } = server;
    this.hasTools = !!tools && Object.keys(tools).length > 0;
    this.hasResources = !!resources && Object.keys(resources).length > 0;
    this.hasPrompts = !!prompts && Object.keys(prompts).length > 0;
  }

  public get mpcHandler(): MCPHandlerInterface {
    return {
      initialize: async (request) => {
        const result: InitializeResult = {
          serverInfo: {
            name: this.server.name,
            version: this.server.version
          },
          protocolVersion: "2024-11-05",
          // protocolVersion: "2025-03-26",
          capabilities: {}
        };

        if (this.hasTools) {
          Object.assign(result.capabilities, {
            tools: {}
          });
        }

        if (this.hasResources) {
          Object.assign(result.capabilities, {
            resources: {}
          });
        }

        if (this.hasPrompts) {
          Object.assign(result.capabilities, {
            prompts: {}
          });
        }
        return result;
      },
      notifications: {
        initialized: async () => {
          return {} satisfies EmptyResult;
        }
      },
      prompts: {
        get: async (payload) => {
          if (!this.hasPrompts) {
            return mcpError("METHOD_NOT_FOUND");
          }

          const prompt = this.server.prompts?.[payload.name];

          if (!prompt) {
            return mcpError("METHOD_NOT_FOUND");
          }

          const validatedPayload = await prompt["~validate"](payload.arguments);

          const result = await prompt["~call"](validatedPayload, this.sessionId, this.ctx);
          if (result instanceof MCPError) {
            return result;
          }
          return {
            description: result.description,
            messages: [
              {
                content: {
                  type: "text",
                  text: result.text
                },
                role: result.role || "assistant"
              }
            ]
          };
        },
        list: async (payload) => {
          if (!this.hasPrompts) {
            return mcpError("METHOD_NOT_FOUND");
          }
          return {
            prompts: definePrompts(this.server.prompts || {})
          } satisfies ListPromptsResult;
        }
      },
      resources: {
        list: async (payload) => {
          if (!this.hasResources) {
            return mcpError("METHOD_NOT_FOUND");
          }

          return {
            resources: defineResources(this.server.resources || {})
          } satisfies ListResourcesResult;
        },
        templates: {
          list: async (payload) => {
            if (!this.hasResources) {
              return mcpError("METHOD_NOT_FOUND");
            }

            return {
              resourceTemplates: []
            } satisfies ListResourceTemplatesResult;
          }
        },
        read: async (payload) => {
          if (!this.hasResources) {
            return mcpError("METHOD_NOT_FOUND");
          }

          const resource =
            Object.values(this.server.resources || {}).find((resource) => resource["~uri"] === payload.uri) ||
            this.server.resources?.[payload.uri];

          if (!resource) {
            return mcpError("RESOURCE_NOT_FOUND");
          }

          const [result, type] = await resource["~call"](payload.uri, this.sessionId, this.ctx);

          if (result instanceof MCPError) {
            return result;
          }

          return {
            contents: [
              Object.assign(
                {
                  mimeType: resource["~type"],
                  uri: payload.uri
                },
                type === "text" ? { text: result } : { blob: result }
              )
            ]
          } satisfies ReadResourceResult;
        }
        // subscribe: async (payload) => {
        //   return Server.resources.subscribe(payload, ctx);
        // },
        // unsubscribe: async (payload) => {
        //   return Server.resources.unsubscribe(payload, ctx);
        // }
      },
      tools: {
        call: async (payload) => {
          if (!this.hasTools) {
            return mcpError("METHOD_NOT_FOUND");
          }

          const tool = this.server.tools?.[payload.name];

          if (!tool) {
            return mcpError("METHOD_NOT_FOUND");
          }

          const validatedPayload = await tool["~validate"](payload.arguments);

          const result = await tool["~call"](validatedPayload, this.sessionId, this.ctx, this.env);

          if (result instanceof MCPError) {
            return result;
          }

          if ("isError" in result) {
            return result satisfies CallToolResult;
          }

          if (result instanceof ToolError) {
            return {
              content: result.result.content,
              isError: true
            } satisfies CallToolResult;
          }

          return {
            content: [result]
          } satisfies CallToolResult;
        },
        list: async (payload) => {
          if (!this.hasTools) {
            return mcpError("METHOD_NOT_FOUND");
          }
          return {
            tools: defineTools(this.server.tools || {}, undefined)
          } satisfies ListToolsResult;
        },
        io: async (payload) => {
          if (!this.hasTools) {
            return mcpError("METHOD_NOT_FOUND");
          }
          const toolsResult = defineTools(this.server.tools || {}, true);
          return {
            tools: toolsResult
          } satisfies ListToolsOutputResult;
        }
      },
      ping: async (payload) => {
        return {} satisfies EmptyResult;
      }
    };
  }
}
