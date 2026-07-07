// Import Node's path module so we can resolve the current directory for ESLint's compat layer
import { dirname } from "path";
// Import Node's URL helper to convert the current module's URL into a usable file path
import { fileURLToPath } from "url";
// Import FlatCompat, which lets us use eslint-config-next's older "extends"-style config
// inside ESLint's newer flat config format
import { FlatCompat } from "@eslint/eslintrc";

// Resolve the absolute path to this config file
const __filename = fileURLToPath(import.meta.url);
// Resolve the directory containing this config file (used as the base for resolving configs)
const __dirname = dirname(__filename);

// Create a compatibility helper rooted at this project's directory
const compat = new FlatCompat({
  // Tell FlatCompat where to resolve relative config paths from
  baseDirectory: __dirname,
});

// Build the final flat config array by extending Next.js's recommended rule sets
const eslintConfig = [
  // Pull in Next.js's core web vitals rules and TypeScript rules via the compat layer
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Tell ESLint to skip linting build output and generated files
    ignores: [".next/**", ".open-next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

// Export the final config for ESLint to use
export default eslintConfig;
