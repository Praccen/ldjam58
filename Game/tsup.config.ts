import { defineConfig } from "tsup";
import tsconfig from "./tsconfig.json";

export default defineConfig((options) => ({
  entry: [
    "src/main.ts"
  ],
  dts: false,
  outDir: "dist",
  format: ["esm"],
  name: "Game build",
  splitting: false,
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
  sourcemap: true,
  clean: true,
  target: tsconfig.compilerOptions.target as "es2015",
  minify: false,
  // minify: !options.watch == Conditional config ==
  noExternal: ["praccen-web-engine"],
}));