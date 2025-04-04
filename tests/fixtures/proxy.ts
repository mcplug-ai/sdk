import { Hono } from "hono";
import { rpc } from "./server";

const proxy = new Hono();

proxy.get("/:plugId", async (c) => {
  const toolListResults = await rpc("tools/list", {});

  return c.json({
    id: c.req.param("plugId"),
    servers: [
      {
        id: "server1",
        version: "1.0.0",
        tools: toolListResults.result.tools
      }
    ]
  });
});
proxy.post(":plugId/:serverId/:toolName", async (c) => {
  const { plugId, serverId, toolName } = c.req.param();
  const { arguments: args } = await c.req.json();

  const result = await rpc("tools/call", {
    name: toolName,
    arguments: args
  });

  return c.json(result);
});

export { proxy };
