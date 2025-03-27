import { Ctx, MaybePromise, OmitNever, WithCtx } from "../types";
import { StandardSchemaV1, validateInput } from "../types/standardSchema";
import { toJsonSchema } from "../utils/toJsonSchema";
import { mcpError } from "./mcp/errors";
import { Prompt as MCPPrompt } from "./mcp/spec";

export type PromptPayload<Schema extends StandardSchemaV1 | undefined> = WithCtx<
  OmitNever<{
    input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<Schema> : never;
    sessionId: string;
    userId: string;
    error: typeof error;
  }>
>;

export type HandlePromptPayload<Schema extends StandardSchemaV1 | undefined> = (
  payload: PromptPayload<Schema>
) => MaybePromise<{
  description?: string;
  role?: "assistant" | "user";
  text: string;
}>;

export class Prompt<Schema extends StandardSchemaV1 | undefined, H extends HandlePromptPayload<Schema>> {
  "~schema": Schema;
  "~description": string;
  "~handler": H;
  constructor(description: string) {
    this["~description"] = description;
  }

  "~call" = (
    input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined,
    sessionId: string,
    userId: string,
    ctx?: Ctx
  ) => {
    return this["~handler"]({ input, sessionId, userId, error, ctx } as PromptPayload<Schema>);
  };

  "~validate" = async (input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined) => {
    if (!this["~schema"]) {
      return true;
    }
    return await validateInput(this["~schema"], input);
  };

  input = <SS extends StandardSchemaV1>(standardStandardSchemaV1: SS) => {
    this["~schema"] = standardStandardSchemaV1 as unknown as Schema;
    return this as unknown as Prompt<SS, HandlePromptPayload<SS>>;
  };

  handle = <HH extends HandlePromptPayload<Schema>>(handler: HH) => {
    this["~handler"] = handler as unknown as H;
    return this as unknown as Prompt<Schema, HH>;
  };
}

export const prompt = (description: string) => new Prompt(description);

export const definePrompts = (prompts: Record<string, Prompt<any, any>>) => {
  return Object.entries(prompts).map(([key, prompt]) => {
    return definePrompt(key, prompt);
  });
};

export const definePrompt = (name: string, prompt: Prompt<any, any>) => {
  const { properties, required } = toJsonSchema(prompt["~schema"]);

  return {
    name,
    description: prompt["~description"],
    arguments: Object.entries(properties ?? {}).map(([key, value]) => {
      const isRequired = required?.some((r) => r === key);
      return {
        name: key,
        description: value.description ?? "",
        required: isRequired ?? false
      };
    })
  } satisfies MCPPrompt;
};

const error = (code: "INVALID_PARAMS" | "INTERNAL_ERROR", message: string) => {
  return mcpError(code, message);
};
