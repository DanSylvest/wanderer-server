import babelEslint from "@babel/eslint-parser";
import js from "@eslint/js";

import prettierPlugin from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

// import { FlatCompat } from "@eslint/eslintrc";
// import globals from "globals";
// import * as url from "url";

// const __filename = url.fileURLToPath(import.meta.url);
// const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
// const compat = new FlatCompat({
//   baseDirectory: __dirname, // optional; default: process.cwd()
//   resolvePluginsRelativeTo: __dirname, // optional
// });

export default [
  {
    languageOptions: {
      parser: babelEslint,
      ecmaVersion: "latest",
      // sourceType: "commonjs",
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          // your babel options
          presets: [],
        },
      },
    },
  },
  js.configs.recommended,
  // ...compat.extends("plugin:prettier/recommended"),
  {
    plugins: {
      prettier: prettierPlugin,
    },
  },
  {
    ignores: [
      "js/esi/generated/*",
      "js/tests/*",
      "js/env/cookie.js",
      "js/env/_new/tools/emitter.js",
    ],
  },
  {
    rules: {
      ...prettierPlugin.configs.recommended.rules,
      ...eslintConfigPrettier.rules,
      "global-require": "off",
      "no-await-in-loop": "off",
      "no-plusplus": "off",
      "new-cap": "off",
      "func-names": "off",
      "default-case": "off",
      "no-console": "off",
      "no-underscore-dangle": "off",
      "no-unused-expressions": "off",
      "no-throw-literal": "off",
      // "max-len": "warn",
      "max-len": "off",
      "no-var": "error",
      "prefer-const": "error",
      camelcase: "off",
      "no-undef": "off",
      "class-methods-use-this": "off",
      "no-continue": "off",
      "guard-for-in": "off",
      "no-restricted-syntax": "off",
      "array-callback-return": "off",
      "no-extend-native": "off",
      "no-case-declarations": "off",
      "prefer-rest-params": "off",
      "no-param-reassign": "off",
      "no-use-before-define": "off",
      "no-useless-escape": "off",
      "no-return-assign": "off",
      "no-mixed-operators": "off",
      "no-self-compare": "off",
      "no-nested-ternary": "off",
    },
  },
];
