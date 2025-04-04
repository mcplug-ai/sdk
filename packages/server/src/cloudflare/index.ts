import { authorize, getVersionNumber, handleRpc, Version } from "../core/mcp/handler";
import { DurableObject } from "cloudflare:workers";
import { Tool } from "../core/tools";
import { Prompt } from "../core/prompts";
import { Resource } from "../core/resources";

type DurableMcpOptions = {
  name: string;
};

type CfServer = {
  secret: string;
  versions: Record<string, Version<any, any, any> | string>;
};

const getObjectFromEnv = (env: any, namespace: string, sessionId?: string | null) => {
  const id = env[namespace].idFromName(sessionId || "DEFAULT");
  const object = env[namespace].get(id) as DurableMcp;
  return object;
};

export const createHandler = (server: CfServer) => {
  return {
    fetch: async (request: Request, env?: any, ctx?: ExecutionContext) => {
      const unauthorized = authorize(request, server.secret);
      if (unauthorized) {
        // return unauthorized;
      }
      const versionNumber = getVersionNumber(request);
      if (versionNumber instanceof Response) {
        return versionNumber;
      }
      const version = server.versions[versionNumber];
      if (!version) {
        return new Response("Invalid version", { status: 400 });
      }

      if (typeof version === "string") {
        const object = getObjectFromEnv(env, version);
        return object.handleRpc(request, versionNumber);
      } else {
        return handleRpc(version, versionNumber, request, ctx);
      }
    }
  };
};

class DurableMcp extends DurableObject {
  tools: Record<string, Tool<any, any>> = {};
  prompts: Record<string, Prompt<any, any>> = {};
  resources: Record<string, Resource<any>> = {};
  name: string = "";

  handleRpc(request: Request, version: string) {
    return handleRpc(this, version, request);
  }
}

export const createDurableMcp = (opts: DurableMcpOptions) => {
  return class extends DurableMcp {
    name = opts.name;

    constructor(public ctx: DurableObjectState, public env: any) {
      super(ctx, env);
    }
  };
};

export { tool, prompt, resource } from "../core";
