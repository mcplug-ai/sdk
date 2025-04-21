import { Tool, Prompt, Resource, InitializeResult } from "@mcplug/server";

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
