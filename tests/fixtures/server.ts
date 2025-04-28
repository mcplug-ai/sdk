import { createMCP, resource } from "@mcplug/server";
import { z } from "zod";
import {
  ClientRequest,
  PingRequest,
  InitializeRequest,
  CompleteRequest,
  SetLevelRequest,
  GetPromptRequest,
  ListPromptsRequest,
  ListResourcesRequest,
  ReadResourceRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  CallToolRequest,
  ListToolsRequest,
  ListResourcesResult,
  GetPromptResult,
  ListPromptsResult,
  ListToolsResult,
  CallToolResult,
  CompleteResult,
  ReadResourceResult,
  InitializeResult,
  EmptyResult,
  prompt,
  tool
} from "@mcplug/server";

declare module "@mcplug/server" {
  interface Register {
    CTX: {
      _GOOGLE_API_KEY: string;
    };
    ENV: {
      _GOOGLE_API_KEY: string;
    };
  }
}

const tools = {
  get_weather: tool("Get the weather in a given city")
    .input(
      z.object({
        city: z.string()
      })
    )
    .handle(async ({ input, ctx, env }) => {
      console.log({ ctx, env, input });
      return `The weather in ${input.city} is sunny`;
    }),
  with_error: tool("This tool will always return an error").handle(async ({ error }) => {
    return error("This is a test error");
  }),
  search_web: tool("Search the web for a given query")
    .input(
      z.object({
        query: z.string(),
        _GOOGLE_API_KEY: z.string()
      })
    )
    .handle(async ({ input, ctx, env }) => {
      console.log({ ctx, env, input });
      return {
        type: "text",
        text: `I did not find anything about ${input.query}`
      };
    })
};

const resources = {
  weather: resource("Use this resource to get the weather table in a given city")
    .type("text/csv")
    .handle(async () => {
      return `city,temperature,humidity
San Francisco,60,50
New York,65,45
Los Angeles,70,40
Chicago,55,55
Miami,80,60
`;
    })
};

const prompts = {
  get_weather: prompt("Get the weather in a given city")
    .input(
      z.object({
        city: z.string()
      })
    )
    .handle(async ({ input }) => {
      return {
        type: "text",
        text: `The weather in ${input.city} is sunny`
      };
    })
};

const mcp = createMCP({
  name: "test",
  version: "1.0.0",
  prompts,
  createCtx: (payload) => {
    return {
      payload: "here"
    };
  },
  resources,
  tools
});

const app = {
  fetch: async (request: Request) => {
    return mcp.fetch(request, { env: "here" });
  },
  define: mcp.define
};

export default app;

type Payloads = {
  initialize: InitializeRequest["params"];
  "tools/call": CallToolRequest["params"];
  "tools/list": ListToolsRequest["params"];
  "prompts/list": ListPromptsRequest["params"];
  "prompts/get": GetPromptRequest["params"];
  "resources/list": ListResourcesRequest["params"];
  "resources/read": ReadResourceRequest["params"];
  "completion/complete": CompleteRequest["params"];
  ping: PingRequest["params"];
  //  ----------
  //   subscribe: SubscribeRequest["params"];
  //   unsubscribe: UnsubscribeRequest["params"];
  //   complete: CompleteRequest["params"];
  //   set_level: SetLevelRequest["params"];
  //   "resources/subscribe": SubscribeRequest["params"];
  //   "logging/setLevel": SetLevelRequest["params"];
  //   "resources/unsubscribe": UnsubscribeRequest["params"];
};

type Result<T> = {
  jsonrpc: "2.0";
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type Results = {
  initialize: Result<InitializeResult>;
  "tools/call": Result<CallToolResult>;
  "tools/list": Result<ListToolsResult>;
  "prompts/list": Result<ListPromptsResult>;
  "prompts/get": Result<GetPromptResult>;
  "resources/list": Result<ListResourcesResult>;
  "resources/read": Result<ReadResourceResult>;
  "completion/complete": Result<CompleteResult>;
  ping: Result<EmptyResult>;
};

export const rpc = async <M extends keyof Payloads>(method: M, body: Payloads[M]): Promise<Results[M]> => {
  const request = new Request("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: body
    }),
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json"
    }
  });

  const response = await app.fetch(request);
  const result = await response.json();
  return result;
};
