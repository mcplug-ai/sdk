import { INTERNAL_ERROR } from "./spec";
import { INVALID_PARAMS, METHOD_NOT_FOUND } from "./spec";
import { INVALID_REQUEST } from "./spec";
import { PARSE_ERROR } from "./spec";
import { RESOURCE_NOT_FOUND } from "./spec";

type MCPErrorCode =
  | "PARSE_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "INVALID_REQUEST"
  | "METHOD_NOT_FOUND"
  | "INVALID_PARAMS"
  | "INTERNAL_ERROR";

const mcpErrors: Record<MCPErrorCode, number> = {
  PARSE_ERROR: PARSE_ERROR,
  RESOURCE_NOT_FOUND: RESOURCE_NOT_FOUND,
  INVALID_REQUEST: INVALID_REQUEST,
  METHOD_NOT_FOUND: METHOD_NOT_FOUND,
  INVALID_PARAMS: INVALID_PARAMS,
  INTERNAL_ERROR: INTERNAL_ERROR
};

const defaultErrorMessages: Record<MCPErrorCode, string> = {
  PARSE_ERROR: "Parse error",
  RESOURCE_NOT_FOUND: "Resource not found",
  INVALID_REQUEST: "Invalid request",
  METHOD_NOT_FOUND: "Method not found",
  INVALID_PARAMS: "Invalid parameters",
  INTERNAL_ERROR: "Internal error"
};

export class MCPError {
  "~code": number;
  "~data"?: any;
  "~message"?: string;
  constructor(code: number, message: string, data?: any) {
    this["~code"] = code;
    this["~data"] = data;
    this["~message"] = message;
  }
}

export const mcpError = (code: MCPErrorCode, message?: string, data?: any) => {
  return new MCPError(mcpErrors[code], message || defaultErrorMessages[code], data);
};
