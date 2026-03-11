import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { setVoiceBrainRuntime } from "./src/runtime.js";
import { handleVoiceBrainHttpRequest } from "./src/http.js";

const plugin = {
  id: "voice-brain",
  name: "Voice Brain",
  description: "Gateway-native text brain route for voice shells",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setVoiceBrainRuntime(api.runtime);
    api.registerHttpHandler(handleVoiceBrainHttpRequest);
  },
};

export default plugin;
