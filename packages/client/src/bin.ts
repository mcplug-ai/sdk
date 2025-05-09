#!/usr/bin/env node
import { program } from "commander";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "./rpc";
import { PlugDefinition } from "./types";
import { getToolDefinitions, getToolList } from "./utils";

class RemoteMCPlugClient {
  public readonly server: Server;
  rpc: ReturnType<typeof rpc>;
  availableTools: ListToolsResult["tools"];

  constructor(private readonly id: string, private readonly env: Record<string, string>, private plug: PlugDefinition) {
    this.server = new Server(
      {
        name: "MCPlug Client",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.rpc = rpc({
      id: this.id,
      token: this.env.MCPLUG_TOKEN,
      sessionId: this.server.transport?.sessionId
    });

    this.availableTools = getToolList(this.plug, this.env);

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      return {
        tools: this.availableTools
      };
    });
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const toolDefinition = this.plug.toolDefinitions[request.params.name];
      if (!toolDefinition) {
        return {
          isError: true,
          content: ["Tool not found"]
        };
      }

      const envConstants = toolDefinition.constantsProperties.reduce((acc, key) => {
        if (this.env[key]) {
          Object.assign(acc, { [`_${key}`]: this.env[key] });
        }
        return acc;
      }, {} as Record<string, string>);

      const result = await this.rpc("tools/call", {
        name: request.params.name,
        arguments: {
          ...envConstants,
          ...request.params.arguments
        }
      });

      return {
        isError: !!result.error || result.result.isError,
        content: result.result.content
      };
    });
  }

  static async start(id: string, env: Record<string, string>) {
    const response = await fetch(`https://proxy.mcplug.ai`, {
      headers: {
        Authorization: `Bearer ${env.MCPLUG_TOKEN}`,
        "x-mcplug-client": "stdio",
        "x-mcplug-id": id
      }
    });

    const plug = (await response.json()) as PlugDefinition;

    const client = new RemoteMCPlugClient(id, env, plug);

    const transport = new StdioServerTransport();

    await client.server.connect(transport);
  }
}

class LocalMCPlugClient {
  rpc: ReturnType<typeof rpc>;
  public readonly server: Server;
  constructor(
    private readonly port: string,
    private readonly env: Record<string, string>,
    tools: ListToolsResult["tools"]
  ) {
    this.server = new Server(
      {
        name: "MCPlug Client",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    this.rpc = rpc({
      id: "local",
      token: "DEV",
      sessionId: this.server.transport?.sessionId,
      fetch: (url, options) => {
        return fetch(`http://localhost:${this.port}`, options);
      }
    });

    const [availableTools, toolConstants] = getToolDefinitions(tools, this.env);

    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      return {
        tools: availableTools
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const constants = toolConstants.get(request.params.name) || {};

      const result = await this.rpc("tools/call", {
        name: request.params.name,
        arguments: {
          ...constants,
          ...request.params.arguments
        }
      });

      return {
        isError: !!result.error || result.result.isError,
        content: result.result.content
      };
    });
  }

  static async start(port: string, env: Record<string, string>) {
    const response = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1
      })
    });

    const {
      result: { tools }
    } = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result: ListToolsResult;
    };

    const client = new LocalMCPlugClient(port, env, tools);
    const transport = new StdioServerTransport();
    await client.server.connect(transport);
  }
}

const env = process.env as Record<string, string>;
const id = process.argv[2];
const isDev = process.argv.includes("--dev");

if (isDev) {
  program.option("--dev <port>", "Run in dev mode");
  program.parse();
  const devPort = program.opts().dev;
  void LocalMCPlugClient.start(devPort, env).catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
} else {
  if (!id) {
    console.error("ID is not set");
    process.exit(1);
  }

  if (!env.MCPLUG_TOKEN) {
    console.error("MCPLUG_TOKEN is not set");
    process.exit(1);
  }

  void RemoteMCPlugClient.start(id, env).catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

export default RemoteMCPlugClient;
export { RemoteMCPlugClient, LocalMCPlugClient };
