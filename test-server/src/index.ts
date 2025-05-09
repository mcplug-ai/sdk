import { tool, prompt, resource } from "@mcplug/server";
import { z } from "zod";

export default {
  tools: {
    "get-weather": tool("Use this tool to get the weather in a given city")
      .input(
        z.object({
          city: z.string()
        })
      )
      .output(
        z.object({
          city: z.string(),
          temperature: z.number(),
          unit: z.string(),
          condition: z.string()
        })
      )
      .handle(async ({ input }) => {
        return {
          city: input.city,
          temperature: 20,
          unit: "C",
          condition: "sunny"
        };
      })
  },
  prompts: {
    "get-get": prompt("Use this prompt get a starter question")
      .input(
        z.object({
          city: z.string()
        })
      )
      .handle(async ({ input }) => {
        return {
          role: "user",
          text: `What is the weather in ${input.city}`
        };
      })
  },
  resources: {
    "get-weather": resource("Use this resource to get the weather in a given city").handle(async () => {
      return "The weather in a given city";
    })
  }
};
