import { StandardSchemaV1 } from "../types/standardSchema";
import { toJsonSchema as valibotToJsonSchema } from "@valibot/to-json-schema";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type Type as ArktypeSchema, JsonSchema } from "arktype";
import { AnySchema as ValibotSchema } from "valibot";
import { Schema as ZodSchema } from "zod";

const isArktypeSchema = (schema: StandardSchemaV1): schema is ArktypeSchema => {
  return schema["~standard"].vendor === "arktype";
};

const isValibotSchema = (schema: StandardSchemaV1): schema is ValibotSchema => {
  return schema["~standard"].vendor === "valibot";
};

const isZodSchema = (schema: StandardSchemaV1): schema is ZodSchema => {
  return schema["~standard"].vendor === "zod";
};

export const toJsonSchema = (schema: StandardSchemaV1): JsonSchema.Object => {
  if (isArktypeSchema(schema)) {
    return schema.toJsonSchema() as JsonSchema.Object;
  }
  if (isValibotSchema(schema)) {
    return valibotToJsonSchema(schema) as JsonSchema.Object;
  }
  if (isZodSchema(schema)) {
    return zodToJsonSchema(schema) as JsonSchema.Object;
  }
  throw new Error("Unsupported schema validation library");
};
