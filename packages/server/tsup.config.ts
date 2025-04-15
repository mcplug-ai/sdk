import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/mcp/index.ts"],
  splitting: true,
  skipNodeModulesBundle: true,
  dts: true,
  bundle: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  platform: "node",
  external: ["cloudflare:workers"],
  keepNames: true,
  minify: true,
  sourcemap: true,
  format: ["cjs", "esm"],
  treeshake: true,
  clean: true
});
