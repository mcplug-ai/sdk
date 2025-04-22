const token =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IndDcjAzcVhIMVo1Vkw5QWtPT2VmcjAwNmtDeFV6MHBKIiwicGVybWlzc2lvbnMiOlsidXNlIiwicHVibGlzaCJdLCJpYXQiOjE3NDQ2NTk4MDV9.I6M6mZP4XK9bIScnlar4WdvtEO4Z1wsfI27SnHWJsr8";

const id = "01JRTXGPQ9EASHWDK7V12Z51FY";

import { mcplug } from "@mcplug/client";
import { Schema, Tool, ToolSet } from "ai";
import { z } from "zod";
const schema = z.object({
  city: z.string()
});

const tools = (await mcplug({
  token,
  id
})) as {
  get_weather: Tool<Schema<z.infer<typeof schema>>, z.infer<typeof schema>> & {
    execute: (args: z.infer<typeof schema>) => Promise<z.infer<typeof schema>>;
  };
  get_weather_2: Tool<Schema<z.infer<typeof schema>>, z.infer<typeof schema>> & {
    execute: (args: z.infer<typeof schema>) => Promise<z.infer<typeof schema>>;
  };
};

type T = typeof tools extends ToolSet ? true : false;

import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

const result = await generateText<typeof tools>({
  model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
  messages: [{ role: "user", content: "HEllo what is the weather in São Paulo?" }],
  tools,
  maxSteps: 10,
  onStepFinish: (step) => {
    if (step.stepType === "tool-result") {
      const toolCall = step.toolResults[0];
      if (toolCall.toolName === "get_weather") {
      }
    }
    if (step.stepType === "tool-result") {
      console.log(step.toolCalls[0]);
    }
    if (step.stepType === "tool-result") {
      console.log(step.toolCalls[0]);
    }
  }
});

const firstToolCall = result.toolCalls[0];
if (firstToolCall.toolName === "get_weather") {
  const parameters = firstToolCall.args;
  console.log(result);
}

const firstToolResult = result.toolResults[0];
if (firstToolResult.toolName === "get_weather") {
  const result = firstToolResult.result;
  console.log(result);
}
