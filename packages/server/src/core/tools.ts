import { z } from "zod";
import { Ctx, MaybePromise, OmitNever, WithCtx } from "../types";
import { StandardSchemaV1, validateInput } from "../types/standardSchema";
import { toJsonSchema } from "../utils/toJsonSchema";
import { safeStringify } from "../utils/utils";
import { AudioContent, CallToolResult, ImageContent, TextContent } from "./mcp/spec";
import { AudioMimeType, ImageMimeType, MimeType } from "./mime";
import { toDataUrl } from "./resources";

export type ToolPayload<Schema extends StandardSchemaV1 | undefined, Params extends string[] | undefined> = OmitNever<{
  input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<Schema> : never;
  sessionId: string;
  userId: string;
  error: typeof error;
  blob: typeof blob;
  params: Params extends string[]
    ? {
        [K in Params[number]]: string;
      }
    : never;
}>;

export type HandleToolFunction<Schema extends StandardSchemaV1 | undefined, Params extends string[] | undefined> = (
  payload: ToolPayload<Schema, Params>
) => MaybePromise<any>;

export class Tool<
  Schema extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  H extends HandleToolFunction<Schema, Params> = any,
  Params extends string[] | undefined = string[] | undefined
> {
  "~schema": Schema;
  "~description": string;
  "~cost"?: number;
  "~handler": H;
  "~params": Params;
  constructor(description: string) {
    this["~description"] = description;
  }

  "~call" = (
    input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined,
    params: Params extends string[] ? { [K in Params[number]]: string } : undefined,
    sessionId: string,
    userId: string,
    ctx?: Ctx
  ) => {
    const result = this["~handler"]({
      input,
      params: params as any,
      sessionId,
      userId,
      error,
      blob,
      ctx
    } as ToolPayload<Schema, Params>);

    if (result instanceof BlobResult) {
      return result.result;
    }
    if (typeof result === "string") {
      return {
        type: "text",
        text: result
      } satisfies TextContent;
    }
    return {
      type: "text",
      text: safeStringify(result)
    } satisfies TextContent;
  };

  "~validate" = async (input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined) => {
    if (!this["~schema"]) {
      return true;
    }
    return await validateInput(this["~schema"], input);
  };

  input = <SS extends StandardSchemaV1>(standardStandardSchemaV1: SS) => {
    this["~schema"] = standardStandardSchemaV1 as unknown as Schema;
    return this as unknown as Tool<SS, HandleToolFunction<SS, Params>, Params>;
  };

  cost = (cost: number) => {
    this["~cost"] = cost;
    return this;
  };

  params = <PP extends string[]>(...params: PP) => {
    this["~params"] = params as unknown as Params;
    return this as unknown as Tool<Schema, HandleToolFunction<Schema, PP>, PP>;
  };

  handle = <HH extends HandleToolFunction<Schema, Params>>(handler: HH) => {
    this["~handler"] = handler as unknown as H;
    return this as unknown as Tool<Schema, HH, Params>;
  };
}

export const tool = (description: string) => new Tool(description);

export const defineTools = (tools: Record<string, Tool<any, any, any>>, addCost: boolean = true) => {
  return Object.entries(tools).map(([key, tool]) => {
    return defineTool(key, tool, addCost);
  });
};

export const defineTool = (name: string, tool: Tool<any, any, any>, addCost: boolean = true) => {
  const definition = {
    name,
    description: tool["~description"],
    params: tool["~params"],
    inputSchema: toJsonSchema(tool["~schema"])
  };
  if (addCost) {
    Object.assign(definition, { cost: tool["~cost"] });
  }
  return definition;
};

const error = (message?: string) => {
  return {
    content: [
      {
        type: "text",
        text: message || "An error occurred during tool execution"
      }
    ],
    isError: true
  };
};

class BlobResult {
  result: ImageContent | AudioContent;
  constructor(data: string, mimeType: MimeType) {
    this.result = {
      type: mimeType.startsWith("audio/") ? "audio" : "image",
      mimeType,
      data
    };
  }
}

const blob = (data: string | ArrayBuffer | Uint8Array | Blob | File, mimeType: AudioMimeType | ImageMimeType) => {
  return toDataUrl(data, mimeType).then((data) => {
    return new BlobResult(data, mimeType);
  });
};
