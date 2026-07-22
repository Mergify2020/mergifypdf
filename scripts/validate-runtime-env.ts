import { loadEnvConfig } from "@next/env";
import { assertRuntimeEnvironmentSafe } from "../src/lib/runtimeEnvironment";

loadEnvConfig(process.cwd());

try {
  const result = assertRuntimeEnvironmentSafe(process.env);
  console.log(`Runtime environment validated: ${result.runtime}`);
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Runtime environment validation failed.");
  process.exit(1);
}
