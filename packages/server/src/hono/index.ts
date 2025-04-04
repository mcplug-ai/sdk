import { Hono } from "hono";
import { authorize, handleRpc, Version } from "../core/mcp/handler";

type HonoServer = {
  secret: string;
  versions: Record<string, Version<any, any, any>>;
};

export const createHonoMcp = (server: HonoServer, app = new Hono()) => {
  app.use("*", async (c, next) => {
    return authorize(c.req.raw, server.secret) || next();
  });

  Object.entries(server.versions).forEach(([versionNumber, version]) => {
    app.post(`/${versionNumber}`, async (c) => {
      return handleRpc(version, versionNumber, c.req.raw);
    });
  });

  return app;
};

export { tool, prompt, resource } from "../core";
