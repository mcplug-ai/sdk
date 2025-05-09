import { Hono } from "hono";
import app, { rpc } from "./server";
import { CallToolRequest } from "@mcplug/server";
const proxy = new Hono();

proxy.get("/v1/plug/:plugId", async (c) => {
  const toolListResults = await rpc("tools/list", {});

  return c.json({
    id: c.req.param("plugId"),
    versions: [
      {
        serverId: "server1",
        versionId: "1.0.0",
        tools: toolListResults.result.tools
      }
    ]
  });
});
proxy.post("/v1/plug/:plugId/:versionId", async (c) => {
  return app.fetch(c.req.raw);
});

export { proxy };
