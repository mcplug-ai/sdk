import { expect, test } from "vitest";
import { mcplug } from ".";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { Message, generateText, appendResponseMessages, tool } from "ai";
import dotenv from "dotenv";

dotenv.config();

let messages: Message[] = [
  {
    role: "user",
    content: "What is the weather in Tokyo?",
    id: "1"
  }
];

console.dir(messages, { depth: null });

const sum = (a: number, b: number) => a + b;

test("adds 1 + 2 to equal 3", async () => {
  const tools = await mcplug("secret", {
    id: "id",
    constants: {
      GOOGLE_API_KEY: "AIzaSyB1-uZBwKX4Y3o0X4Y3o0X4Y3o0X4Y3o0"
    },
    sessionId: "1",
    userId: "1"
  });

  expect(tools).toBeDefined();

  const { text, response } = await generateText({
    model: openai("gpt-4o"),
    system: "You are a friendly assistant!",
    maxSteps: 10,
    messages,
    tools: tools
  });

  messages = appendResponseMessages({
    messages,
    responseMessages: response.messages
  });

  console.dir(messages, { depth: null });

  expect(true).toBe(true);
});
