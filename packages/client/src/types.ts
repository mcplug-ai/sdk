import { Tool, Prompt, Resource, InitializeResult } from "@mcplug/server";
import { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
export type Plug = {
  id: string;
  name: string;
  ownerId: string;
  versions: ServerVersion[];
};
export type ServerVersion = {
  serverId: string;
  versionId: string;
  tools: Tool[];
  prompts?: Prompt[];
  resources?: Resource[];
  name: string;
  ownerId: string;
};

export type PlugResponse = {
  id: string;
  initializeResult: InitializeResult;
  constants: Record<string, string>;
  versions: {
    versionId: string;
    tools: Tool[];
    prompts?: Prompt[];
    resources?: Resource[];
  }[];
};

export type ToolDefinition = {
  versionId: string;
  name: string;
  description: string | undefined;
  inputSchema: any;
  constants: Record<string, string>;
  constantsProperties: string[];
  requiredConstants: string[];
};

export type PlugDefinition = {
  availableTools: ListToolsResult["tools"];
  notAvailableTools: (ListToolsResult["tools"][number] & { if: string[] })[];
  toolDefinitions: Record<string, ToolDefinition>;
  constants: string[];
};
