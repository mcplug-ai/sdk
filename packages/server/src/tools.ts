import { JsonSchema } from "arktype";
import { CTX, ENV, MaybePromise, OmitNever, WithCtxAndEnv } from "./types";
import { StandardSchemaV1, validateInput } from "./types/standardSchema";
import { toJsonSchema } from "./utils/toJsonSchema";
import { safeStringify } from "./utils/utils";
import { AudioContent, ImageContent, TextContent, Tool as SpecTool } from "./mcp/spec";
import { AudioMimeType, ImageMimeType, MimeType } from "./mime";
import { toDataUrl } from "./resources";

export type ToolPayload<Schema extends StandardSchemaV1 | undefined> = WithCtxAndEnv<{
  input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<Schema> : never;
  sessionId: string;
  error: typeof error;
  blob: typeof blob;
}>;

export type HandleToolFunction<Schema extends StandardSchemaV1 | undefined> = (
  payload: ToolPayload<Schema>
) => MaybePromise<any>;

export class Tool<
  Schema extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  H extends HandleToolFunction<Schema> = any
> {
  "~schema": Schema;
  "~description": string;
  "~output"?: StandardSchemaV1;
  "~handler": H;

  constructor(description: string) {
    this["~description"] = description;
  }

  "~call" = async (
    input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined,
    sessionId?: string,
    ctx?: CTX,
    env?: ENV
  ) => {
    try {
      const result = await this["~handler"]({
        input,
        sessionId,
        error,
        env,
        blob,
        ctx
      } as ToolPayload<Schema>);

      if (result instanceof ToolError) {
        return result.result;
      }

      if (result instanceof BlobResult) {
        return result.result;
      }

      if (typeof result === "string") {
        return {
          type: "text" as const,
          text: result
        } satisfies TextContent;
      }

      return {
        type: "text" as const,
        text: safeStringify(result)
      } satisfies TextContent;
    } catch (err) {
      if (err instanceof ToolError) {
        return err;
      }
      return new ToolError(err instanceof Error ? err.message || "Unknown error" : "Unknown error");
    }
  };

  "~validate" = async (input: Schema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<Schema> : undefined) => {
    if (!this["~schema"]) {
      return undefined;
    }
    return validateInput(this["~schema"], input);
  };

  input = <SS extends StandardSchemaV1>(standardStandardSchemaV1: SS) => {
    this["~schema"] = standardStandardSchemaV1 as unknown as Schema;
    return this as unknown as Tool<SS, HandleToolFunction<SS>>;
  };

  output = (schema: StandardSchemaV1) => {
    this["~output"] = schema;
    return this as Tool<Schema, H>;
  };

  handle = <HH extends HandleToolFunction<Schema>>(handler: HH) => {
    this["~handler"] = handler as unknown as H;
    return this as unknown as Tool<Schema, HH>;
  };
}

export const tool = (description: string) => new Tool(description);

export const defineTools = <O extends true | undefined>(tools: Record<string, Tool<any, any>>, withOutput: O) => {
  return Object.entries(tools).map(([key, tool]) => {
    return defineTool<O>(key, tool, withOutput);
  });
};

export const defineTool = <O extends true | undefined>(
  name: string,
  tool: Tool<any, any>,
  withOutput?: O
): O extends true ? SpecTool & { outputSchema: JsonSchema.Object } : SpecTool => {
  const definition = {
    name,
    description: tool["~description"],
    inputSchema: tool["~schema"]
      ? toJsonSchema(tool["~schema"])
      : ({
          type: "object"
        } as JsonSchema.Object)
  } as SpecTool;

  if (withOutput === true) {
    Object.assign(definition, {
      outputSchema: tool["~output"]
        ? toJsonSchema(tool["~output"])
        : ({
            type: "object"
          } as JsonSchema.Object)
    });
    return definition as SpecTool & { outputSchema: JsonSchema.Object };
  } else {
    // @ts-ignore
    return definition as SpecTool;
  }
};

export class ToolError {
  constructor(public message?: string) {}
  get result() {
    return {
      content: [
        {
          type: "text" as const,
          text: this.message || "An error occurred during tool execution"
        }
      ],
      isError: true
    };
  }
}

const error = (message?: string) => {
  return new ToolError(message);
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
