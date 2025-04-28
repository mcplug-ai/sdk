const token =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ImpuWWtCb3lvRmxEQ3l3ZzJNek5yWnlqM3pmT1FWNXhYIiwicGVybWlzc2lvbnMiOlsidXNlIl0sImlhdCI6MTc0NDk5MzIxMn0.MWSawNgSMb3ylhJ-66SxglEiLse6AfKQMcgcZbRYeXg";
import { mcplug } from "@mcplug/client/ai";
const id = "01JSW6GATHRMVKB7NS6D26F3D6";
const tools = await mcplug<MCPLUG_Caca>({
  token,
  id,
  constants: {
    EXA_API_KEY: "3f40c3c7-42eb-4293-850f-5b4d833a376b"
  }
});
//
// console.log(tools);

import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

const result = await generateText({
  model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
  messages: [{ role: "user", content: "Do a simple search on the web for the latest news about mcp servers" }],
  tools,
  maxSteps: 10
});

// console.log(result);

// const firstToolCall = result.toolCalls[0];
// if (firstToolCall.toolName === "web_search_tool") {
//   const parameters = firstToolCall.args;
//   console.log(parameters);
// }

// result.toolResults.forEach((toolResult) => {
//   if (toolResult.toolName === "web_search_tool") {
//     const result = toolResult.result;
//     console.log(result.results);
//   }
// });

console.log(result.text);
