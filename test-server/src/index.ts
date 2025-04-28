import { tool, prompt, resource, type CreateCtx } from "@mcplug/server";
import { z } from "zod";

// Context will be available in the handle functions. If you do not need it, you can remove it or comment it out.
export const createCtx = (({ env, sessionId }) => {
  return {
    hello: "world"
  };
}) satisfies CreateCtx;

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
        console.log(input);
        return {
          city: input.city,
          temperature: 20,
          unit: "C",
          condition: "sunny"
        };
      })
  },
  prompts: {
    "get-weather": prompt("Use this tool to get the weather in a given city")
      .input(
        z.object({
          city: z.string()
        })
      )
      .handle(async ({ input }) => {
        return {
          text: `The weather in ${input.city} is sunny with a temperature of 20C`
        };
      })
  },
  resources: {
    "get-weather": resource("Use this resource to get the weather in a given city").handle(async () => {
      return "The weather in a given city";
    })
  }
};
