const token =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ImpuWWtCb3lvRmxEQ3l3ZzJNek5yWnlqM3pmT1FWNXhYIiwicGVybWlzc2lvbnMiOlsidXNlIl0sImlhdCI6MTc0NDk5MzIxMn0.MWSawNgSMb3ylhJ-66SxglEiLse6AfKQMcgcZbRYeXg";

const id = "01JS4V4X1DVABP9RYHCTCMYHAX";

import { mcplug } from "@mcplug/client";
import { Tool, ToolSet } from "ai";
import { z } from "zod";

// const tools = await mcplug({
//   token,
//   id
// });
//
// console.log({ tools });

const response = await fetch(`https://proxy.mcplug.ai/v1/plug/${id}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const plug = (await response.json()) as any;
console.log({ plug });

// type T = typeof tools extends ToolSet ? true : false;

// import { generateText } from "ai";
// import { createGroq } from "@ai-sdk/groq";

// const groq = createGroq({
//   apiKey: process.env.GROQ_API_KEY
// });

// const result = await generateText<typeof tools>({
//   model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
//   messages: [{ role: "user", content: "HEllo what is the weather in São Paulo?" }],
//   tools,
//   maxSteps: 10,
//   onStepFinish: (step) => {
//     if (step.stepType === "tool-result") {
//       const toolCall = step.toolResults[0];
//       if (toolCall.toolName === "get_weather") {
//       }
//     }
//     if (step.stepType === "tool-result") {
//       console.log(step.toolCalls[0]);
//     }
//   }
// });
