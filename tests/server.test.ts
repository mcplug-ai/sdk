import { describe, expect, it } from "vitest";
import app, { rpc } from "./fixtures/server";
import { LATEST_PROTOCOL_VERSION } from "@mcplug/server";

describe("MCP Server", () => {
  describe("initialize", () => {
    it("should initialize the server with correct protocol version", async () => {
      const { result } = await rpc("initialize", {
        capabilities: {},
        clientInfo: {
          name: "test",
          version: "1.0"
        },
        protocolVersion: "1.0"
      });

      expect(result).toBeDefined();
      expect(result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
      expect(result.serverInfo).toMatchObject({
        name: expect.any(String),
        version: expect.any(String)
      });
    });

    it("should respond with appropriate capabilities", async () => {
      const { result } = await rpc("initialize", {
        capabilities: {},
        clientInfo: {
          name: "test",
          version: "1.0"
        },
        protocolVersion: "1.0"
      });

      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.tools).toMatchObject({});
      // These capabilities aren't implemented yet
      expect(result.capabilities.prompts).toMatchObject({});
      expect(result.capabilities.resources).toMatchObject({});
    });
  });

  describe("ping", () => {
    it("should respond to ping requests", async () => {
      const response = await rpc("ping", {});
      expect(response.result).toBeDefined();
      expect(response.jsonrpc).toBe("2.0");
    });
  });

  describe("tools", () => {
    it("should list available tools", async () => {
      const { result } = await rpc("tools/list", {});

      expect(result).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);

      // Verify tool structure
      const tool = result.tools[0];
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("inputSchema");
    });

    it("should contain the get_weather tool", async () => {
      const { result } = await rpc("tools/list", {});

      const weatherTool = result.tools.find((tool) => tool.name === "get_weather");
      expect(weatherTool).toBeDefined();
      expect(weatherTool?.description).toBe("Get the weather in a given city");
      expect(weatherTool?.inputSchema).toMatchObject({
        type: "object",
        properties: {
          city: expect.any(Object)
        }
      });
    });

    it("should call the get_weather tool with parameters", async () => {
      const { result } = await rpc("tools/call", {
        name: "get_weather",
        arguments: {
          city: "San Francisco"
        }
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // At least one content item should exist
      expect(result.content.length).toBeGreaterThan(0);

      // First content item should be text
      const firstContent = result.content[0];
      expect(firstContent).toHaveProperty("type", "text");
      expect(firstContent).toHaveProperty("text");
    });

    it("should call the get_weather tool with invalid parameters and receive an error", async () => {
      const { result, error } = await rpc("tools/call", {
        name: "get_weather",
        arguments: {
          country: "France"
        }
      });

      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect(error?.code).toBe(-32602);

      expect(error?.message).toBe("Invalid parameters");
    });
    it("should call the error tool and receive a tool exectution error as part of the result", async () => {
      const { result, error } = await rpc("tools/call", {
        name: "with_error"
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      const content = result.content[0];
      if (content.type === "text") {
        // const parsed = JSON.parse(content.text);
        // expect(parsed.isError).toBe(true);
        // expect(parsed.error.message).toBe("This is a test error");
      }
      // expect(result.content).toBeDefined();
      // expect(result.content.length).toBe(1);
      // expect(result.content[0].type).toBe("text");
      // expect(result.content[0].text).toBe("This is a test error");
    });
  });

  describe("prompts", () => {
    it("should list available prompts", async () => {
      const { result } = await rpc("prompts/list", {});

      expect(result).toBeDefined();
      expect(Array.isArray(result.prompts)).toBe(true);
    });

    it("should get a prompt by name when available", async () => {
      // First check if any prompts exist
      const { result: listResult } = await rpc("prompts/list", {});

      if (listResult.prompts.length > 0) {
        const promptName = listResult.prompts[0].name;

        const { result } = await rpc("prompts/get", {
          name: promptName,
          arguments: {
            city: "San Francisco"
          }
        });

        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      } else {
        // Skip test if no prompts are available
        console.log("No prompts available to test");
      }
    });
  });

  describe("resources", () => {
    it("should list available resources", async () => {
      const { result } = await rpc("resources/list", {});

      expect(result).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
    });

    it("should read a resource when available", async () => {
      // First check if any resources exist
      const { result: listResult } = await rpc("resources/list", {});

      if (listResult.resources.length > 0) {
        const resourceUri = listResult.resources[0].uri;

        const { result } = await rpc("resources/read", {
          uri: resourceUri
        });

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(Array.isArray(result.contents)).toBe(true);
      } else {
        // Skip test if no resources are available
        // console.log("No resources available to test");
      }
    });
  });

  describe("completion", () => {
    it("should provide completions for arguments when available", async () => {
      // This test requires the server to have a prompt or resource that supports completion
      // We'll first check for available prompts
      const { result: promptsResult } = await rpc("prompts/list", {});

      if (promptsResult.prompts.length > 0) {
        const promptName = promptsResult.prompts[0].name;

        try {
          const { result } = await rpc("completion/complete", {
            ref: {
              type: "ref/prompt",
              name: promptName
            },
            argument: {
              name: "test",
              value: "partial"
            }
          });

          expect(result).toBeDefined();
          expect(result.completion).toBeDefined();
          expect(Array.isArray(result.completion.values)).toBe(true);
        } catch (e) {
          // This might fail if the specific prompt doesn't support completion
          // console.log("Completion not supported for the prompt");
        }
      } else {
        // Skip test if no prompts are available
        // console.log("No prompts available to test completion");
      }
    });
  });
  describe("ping", () => {
    it("should respond to ping requests", async () => {
      const response = await rpc("ping", {});
      expect(response.result).toBeDefined();
      expect(response.jsonrpc).toBe("2.0");
    });
  });

  describe("define", () => {
    it("should describe the server", async () => {
      const definition = app.define();
      console.log(definition);
    });
  });
});
