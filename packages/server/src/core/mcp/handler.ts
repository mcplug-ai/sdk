import { MaybePromise } from "../../types";
import { defineTools, Tool } from "../tools";
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
  Tool as SpecTool
} from "./spec";

export interface ListToolsOutputResult extends PaginatedResult {
  tools: (SpecTool & {
    outputSchema: SpecTool["inputSchema"];
  })[];
}

type MCPHandler = {
  initialize: (payload: InitializeRequest["params"]) => MaybePromise<InitializeResult | MCPError>;
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
  };
  tools: {
    call: (payload: CallToolRequest["params"]) => MaybePromise<CallToolResult | MCPError>;
    list: (payload: ListToolsRequest["params"]) => MaybePromise<ListToolsResult | MCPError>;
    io: (payload: ListToolsRequest["params"]) => MaybePromise<ListToolsResult | MCPError>;
  };
  ping?: (payload: PingRequest) => MaybePromise<EmptyResult | MCPError>;
};

type RPCRequest = ClientRequest & { id: RequestId };

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

const isBatch = (body: RPCRequest | RPCRequest[]): body is RPCRequest[] => {
  return Array.isArray(body);
};

export const handleRpc = async (
  version: Version<any, any, any>,
  versionNumber: string,
  request: Request,
  ctx?: any
) => {
  if (request.method === "GET") {
    return new Response("Hello, world", {
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }

  const sessionId = request.headers.get("Mcp-Session-Id") || crypto.randomUUID();
  const userId = request.headers.get("Mcp-User-Id") || crypto.randomUUID();
  const body = (await request.json()) as RPCRequest | RPCRequest[];
  const isBatchRequest = isBatch(body);
  let requests = isBatchRequest ? body : ([body] as RPCRequest[]);
  const { prompts, resources, tools } = version;
  const hasTools = !!tools && Object.keys(tools).length > 0;
  const hasResources = !!resources && Object.keys(resources).length > 0;
  const hasPrompts = !!prompts && Object.keys(prompts).length > 0;

  const mpcHandler: MCPHandler = {
    initialize: async (payload) => {
      const result: InitializeResult = {
        serverInfo: {
          name: version.name || versionNumber,
          version: versionNumber
        },
        protocolVersion: "2025-03-26",
        capabilities: {}
      };

      if (hasTools) {
        Object.assign(result.capabilities, {
          tools: {}
        });
      }

      if (hasResources) {
        Object.assign(result.capabilities, {
          resources: {}
        });
      }

      if (hasPrompts) {
        Object.assign(result.capabilities, {
          prompts: {}
        });
      }
      return result;
    },
    prompts: {
      get: async (payload) => {
        console.log(payload);
        if (!hasPrompts) {
          return mcpError("METHOD_NOT_FOUND");
        }

        const prompt = prompts[payload.name];

        if (!prompt) {
          return mcpError("METHOD_NOT_FOUND");
        }

        if (!(await prompt["~validate"](payload.arguments))) {
          return mcpError("INVALID_PARAMS");
        }
        const result = await prompt["~call"](payload.arguments, sessionId, userId, ctx);
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
        if (!hasPrompts) {
          return mcpError("METHOD_NOT_FOUND");
        }
        return {
          prompts: definePrompts(prompts)
        } satisfies ListPromptsResult;
      }
    },
    resources: {
      list: async (payload) => {
        if (!hasResources) {
          return mcpError("METHOD_NOT_FOUND");
        }

        return {
          resources: defineResources(resources)
        } satisfies ListResourcesResult;
      },
      read: async (payload) => {
        if (!hasResources) {
          return mcpError("METHOD_NOT_FOUND");
        }

        const resource = Object.values(resources).find((resource) => resource["~uri"] === payload.uri);

        if (!resource) {
          return mcpError("RESOURCE_NOT_FOUND");
        }

        const [result, type] = await resource["~call"](payload.uri, sessionId, userId, ctx);

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
        if (!hasTools) {
          return mcpError("METHOD_NOT_FOUND");
        }

        const tool = tools[payload.name];

        if (!tool) {
          return mcpError("METHOD_NOT_FOUND");
        }

        if (!(await tool["~validate"](payload.arguments))) {
          return mcpError("INVALID_PARAMS");
        }

        const result = await tool["~call"](payload.arguments, {}, sessionId, userId, ctx);

        if (result instanceof MCPError) {
          return result;
        }

        if (result.isError) {
          return result;
        }

        return {
          content: [result]
        } satisfies CallToolResult;
      },
      list: async (payload) => {
        if (!hasTools) {
          return mcpError("METHOD_NOT_FOUND");
        }
        return {
          tools: defineTools(tools, undefined)
        } satisfies ListToolsResult;
      },
      io: async (payload) => {
        if (!hasTools) {
          return mcpError("METHOD_NOT_FOUND");
        }
        const toolsResult = defineTools(tools, true);
        return {
          tools: toolsResult
        } satisfies ListToolsOutputResult;
      }
    },
    ping: async (payload) => {
      return {} satisfies EmptyResult;
    }
  };

  const results = await Promise.all(
    requests.map(async (request) => {
      const { method, params, id } = request;
      let handler = mpcHandler as any;
      for (const key of method.split("/")) {
        if (key in handler) {
          handler = handler[key];
        } else {
          const error = mcpError("METHOD_NOT_FOUND");
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: error["~code"],
              message: error["~message"],
              data: error["~data"]
            }
          };
        }
      }

      const result = await handler(params, ctx);

      if (result instanceof MCPError) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: result["~code"],
            message: result["~message"],
            data: result["~data"]
          }
        };
      } else {
        return {
          jsonrpc: "2.0",
          id,
          result
        };
      }
    })
  );
  return new Response(JSON.stringify(isBatchRequest ? results : results[0]), {
    headers: {
      "Content-Type": "application/json",
      "Mcp-Session-Id": sessionId
    }
  });
};

export const authorize = (request: Pick<Request, "headers">, secret: string) => {
  if (!secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (secret !== request.headers.get("authorization")?.split(" ")[1]) {
    return new Response("Unauthorized", { status: 401 });
  }
};

export const getVersionNumber = (request: Request) => {
  const versionNumber = request.url.split("/").pop();
  if (!versionNumber) {
    return new Response("Invalid request", { status: 400 });
  }
  return versionNumber;
};
