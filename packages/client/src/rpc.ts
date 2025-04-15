import {
  PingRequest,
  InitializeRequest,
  CompleteRequest,
  GetPromptRequest,
  ListPromptsRequest,
  ListResourcesRequest,
  ReadResourceRequest,
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
  EmptyResult
} from "@mcplug/server";
import { McplugOptions } from ".";

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

export const rpc =
  ({
    id,
    token,
    userId,
    sessionId,
    fetch: _fetch = fetch
  }: {
    id: string;
    token: string;
    userId: string;
    sessionId: string;
    fetch?: typeof fetch;
  }) =>
  async <M extends keyof Payloads>(method: M, body: Payloads[M], versionId?: string): Promise<Results[M]> => {
    const response = await _fetch(`https://proxy.mcplug.ai/v1/plug/${id}${versionId ? `/${versionId}` : ""}`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: body
      }),
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        "cache-tag": "no-cache",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "mcp-user-id": userId,
        "mcp-session-id": sessionId
      }
    });

    const result = await response.json();
    return result;
  };
