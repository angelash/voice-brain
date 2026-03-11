import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setVoiceBrainRuntime(next: PluginRuntime): void {
  runtime = next;
}

export function getVoiceBrainRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Voice Brain runtime not initialized");
  }
  return runtime;
}
