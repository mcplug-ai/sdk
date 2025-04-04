import { z } from "zod";
import { tool, createHonoMcp } from "@mcplug/server/hono";

const app = createHonoMcp({
  secret: "secret",
  versions: {
    "1.0.0": {
      name: "Weather_Mcp",
      tools: {
        "get-weather": tool("Use this tool to get the weather in a given city")
          .input(
            z.object({
              city: z.string(),
              _GOOGLE_API_KEY: z.string()
            })
          )
          .handle(async ({ input }) => {
            return {
              city: input.city,
              temp: 20,
              unit: "C",
              condition: "sunny"
            };
          })
      }
    }
  }
});

export default app;
