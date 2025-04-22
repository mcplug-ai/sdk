import { Schema, Tool, ToolSet } from "ai";

export type GeneratedPlug = Record<
  string,
  {
    IN: Record<string, any>;
    OUT: Record<string, any>;
  }
>;

export type InferTools<T extends GeneratedPlug> = {
  [K in keyof T]: Tool<Schema<T[K]>> & {
    execute: (args: T[K]["IN"]) => Promise<T[K]["OUT"]>;
  };
};
