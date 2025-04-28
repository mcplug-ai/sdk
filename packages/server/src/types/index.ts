import { Prompt } from "../prompts";
import { Resource } from "../resources";
import { Tool } from "../tools";
export { type StandardSchemaV1 } from "./standardSchema";

export type OmitNever<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K;
  }[keyof T]
>;
export type MaybePromise<T> = Promise<T> | T;

export interface Register {}

export type CTX = Register extends {
  CTX: infer _Ctx;
}
  ? _Ctx
  : undefined;

export type ENV = Register extends {
  ENV: infer _Env;
}
  ? _Env
  : undefined;

export type WithCtx<T> = CTX extends undefined ? T : T & { ctx: CTX };
export type WithEnv<T> = ENV extends undefined ? T : T & { env: ENV };

export type WithCtxAndEnv<T> = WithCtx<WithEnv<T>>;

export type CreateCtx = (payload: { env: ENV; sessionId?: string }) => MaybePromise<any>;

export type MCPServer = {
  createCtx?: CreateCtx;
  tools?: Record<string, Tool<any, any>>;
  prompts?: Record<string, Prompt<any, any>>;
  resources?: Record<string, Resource<any>>;
  name: string;
  version: string;
};
