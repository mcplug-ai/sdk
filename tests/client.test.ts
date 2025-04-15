import { describe, expect, it } from "vitest";
import { rpc } from "./fixtures/server";
import { mcplug } from "@mcplug/client";
import { proxy } from "./fixtures/proxy";

describe("Client", () => {
  it("should be able to retrieve the tools", async () => {
    const tools = await mcplug({
      token: "token",
      id: "plug1",
      constants: {},
      sessionId: "session1",
      userId: "user1",
      fetch: async (url, init) => {
        const request = new Request(url, init);
        return proxy.fetch(request);
      }
    });

    expect(tools).toBeDefined();

    expect(tools.get_weather).toBeDefined();
    expect(tools.with_error).toBeDefined();
    // This is because the tool requires a _GOOGLE_API_KEY as constant and we didn't provide it
    expect(tools.search_web).toBeUndefined();
  });
  it("should be able to retrieve the tools with constants", async () => {
    const tools = await mcplug({
      token: "token",
      id: "plug1",
      constants: {
        GOOGLE_API_KEY: "1234567890"
      },
      sessionId: "session1",
      userId: "user1",
      fetch: async (url, init) => {
        const request = new Request(url, init);
        return proxy.fetch(request);
      }
    });

    expect(tools).toBeDefined();

    expect(tools.get_weather).toBeDefined();
    expect(tools.with_error).toBeDefined();
    // This is because the tool requires a _GOOGLE_API_KEY as constant and we didn't provide it
    expect(tools.search_web).toBeDefined();
  });

  it("should be able to exectute the tool", async () => {
    const tools = await mcplug({
      token: "token",
      id: "plug1",
      constants: {
        GOOGLE_API_KEY: "1234567890"
      },
      sessionId: "session1",
      userId: "user1",
      fetch: async (url, init) => {
        const request = new Request(url, init);
        return proxy.fetch(request);
      }
    });

    const result = await tools.get_weather?.execute?.(
      {
        city: "São Paulo"
      },
      {
        messages: [],
        toolCallId: "123"
      }
    );

    expect(result).toBeDefined();
    expect(result?.type).toBe("text");

    expect(result?.text).toBe("The weather in São Paulo is sunny");

    const result2 = await tools.search_web?.execute?.(
      {
        query: "What is the weather in São Paulo?"
      },
      {
        messages: [],
        toolCallId: "123"
      }
    );
  });
});
