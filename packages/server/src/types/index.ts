export { type StandardSchemaV1 } from "./standardSchema";

export type OmitNever<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K;
  }[keyof T]
>;
export type MaybePromise<T> = Promise<T> | T;

export interface Register {
  Ctx: string;
}

export type Ctx = Register extends {
  Ctx: infer _Ctx;
}
  ? _Ctx
  : undefined;

export type WithCtx<T> = Ctx extends undefined ? T : T & { ctx: Ctx };
