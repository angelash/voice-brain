import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setVoiceBrainRuntime(next: PluginRuntime): void {
  runtime = next;
}

export function getVoiceBrainRuntime(): PluginRuntime | null {
  return runtime;
}
