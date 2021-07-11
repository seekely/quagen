import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/quagen/ui/exports.js",
  output: {
    file: "src/quagen/static/js/ui.js",
    format: 'iife',
    name: "ui",
    sourcemap: true
  },
  watch: {
    clearScreen: false
  },
  plugins: [
    svelte({

      include: 'src/quagen/ui/**/*.svelte',
      emitCss: false,
      
      // Svelete compiler options, 
      // see https://svelte.dev/docs#svelte_compile
      compilerOptions: {
        css: css => {
          css.write("src/quagen/static/css/ui.css");
        }
      }

    }),
    resolve({ browser: true }),
    commonjs(),
    terser(),
  ]
}