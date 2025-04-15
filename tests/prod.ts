const token =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IndDcjAzcVhIMVo1Vkw5QWtPT2VmcjAwNmtDeFV6MHBKIiwicGVybWlzc2lvbnMiOlsidXNlIiwicHVibGlzaCJdLCJpYXQiOjE3NDQ2NTk4MDV9.I6M6mZP4XK9bIScnlar4WdvtEO4Z1wsfI27SnHWJsr8";

const id = "01JRTXGPQ9EASHWDK7V12Z51FY";

import { mcplug } from "@mcplug/client";

const tools = await mcplug({
  token,
  id
});

import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

const result = await generateText({
  model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
  messages: [{ role: "user", content: "HEllo what is the weather in São Paulo?" }],
  tools,
  maxSteps: 10
});

console.log(result.text);
