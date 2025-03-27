import { Ctx, MaybePromise, WithCtx } from "../types";
import { lookup } from "mrmime";
import { MimeType } from "./mime";
import { MCPError, mcpError } from "./mcp/errors";
export type ResourcePayload = WithCtx<{
  uri: string;
  sessionId: string;
  userId: string;
  error: typeof error;
}>;

export type HandleResourceFunction = (payload: ResourcePayload) => MaybePromise<string | Blob | ArrayBuffer | File>;

export const toDataUrl = async (data: string | ArrayBuffer | Uint8Array | Blob | File, mimeType: MimeType) => {
  if (typeof data === "string") {
    return data;
  }
  const buffer =
    data instanceof ArrayBuffer
      ? data
      : data instanceof Uint8Array
      ? data.buffer
      : data instanceof Blob
      ? await data.arrayBuffer()
      : new ArrayBuffer(0);
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
  return `data:${mimeType};base64,${btoa(binary)}`;
};

export class Resource<H extends HandleResourceFunction> {
  "~type": MimeType;
  "~uri": string;
  "~description": string;
  "~handler": H;
  constructor(description: string) {
    this["~description"] = description;
  }

  "~call" = async (
    uri: string,
    sessionId: string,
    userId: string,
    ctx?: Ctx
  ): Promise<[string, "text" | "blob"] | [MCPError, "error"]> => {
    const result = await this["~handler"]({ uri, sessionId, userId, error, ctx } as ResourcePayload);

    if (typeof result === "string") {
      return [result, "text"] as const;
    }

    const isBlob = result instanceof Blob;
    const isArrayBuffer = result instanceof ArrayBuffer;
    const isFile = result instanceof File;
    const isUint8Array = result instanceof Uint8Array;

    if (isFile || isBlob || isArrayBuffer || isUint8Array) {
      return [await toDataUrl(result, this["~type"]), "blob"] as const;
    }

    return [error("RESOURCE_NOT_FOUND"), "error"] as const;
  };

  type = (type: MimeType) => {
    const mime = lookup(type);
    if (!mime) {
      throw new Error(`Invalid mime type: ${type}`);
    }
    this["~type"] = type;
    return this;
  };

  uri = (uri: string) => {
    this["~uri"] = uri;
    return this;
  };

  handle = <HH extends HandleResourceFunction>(handler: HH) => {
    this["~handler"] = handler as unknown as H;
    return this as unknown as Resource<HH>;
  };
}

export const resource = (description: string) => new Resource(description);

export const defineResources = (resources: Record<string, Resource<any>>, addCost: boolean = true) => {
  return Object.entries(resources).map(([key, resource]) => {
    return defineResource(key, resource, addCost);
  });
};

export const defineResource = (name: string, resource: Resource<any>, addCost: boolean = true) => {
  const definition = {
    name,
    uri: resource["~uri"],
    description: resource["~description"],
    mimeType: resource["~type"]
  };
  return definition;
};

const error = (
  code: "RESOURCE_NOT_FOUND" | "INTERNAL_ERROR",
  message?: string,
  data?: {
    uri: string;
  }
) => {
  return mcpError(code, message, data);
};
