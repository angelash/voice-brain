import { createPluginRuntimeStore } from "openclaw/plugin-sdk/compat";
import type { PluginRuntime } from "openclaw/plugin-sdk/core";

const { setRuntime: setVoiceBrainRuntime, getRuntime: getVoiceBrainRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Voice Brain runtime not initialized");

export { getVoiceBrainRuntime, setVoiceBrainRuntime };
